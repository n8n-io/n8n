import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import { type INodeType, type INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

import { AgentsBuilderSettingsService } from '@/modules/agents/builder/agents-builder-settings.service';
import { NodeTypes } from '@/node-types';

import { WorkflowBuilderV2Controller } from '../workflow-builder-v2.controller';
import { WorkflowBuilderV2Service } from '../workflow-builder-v2.service';

import { buildScriptedModel, textResponse, toolCallsResponse } from './fixtures/scripted-model';

function makeNodeDescription(
	nodeType: string,
	displayName: string,
	version: number,
): INodeTypeDescription {
	return {
		name: nodeType,
		displayName,
		group: ['transform'],
		version,
		description: displayName,
		defaults: { name: displayName },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		credentials: [],
	};
}

function installNodeTypesFixture() {
	const descriptions = new Map<string, INodeTypeDescription>([
		[
			'n8n-nodes-base.scheduleTrigger',
			makeNodeDescription('n8n-nodes-base.scheduleTrigger', 'Schedule Trigger', 1),
		],
		[
			'n8n-nodes-base.httpRequest',
			makeNodeDescription('n8n-nodes-base.httpRequest', 'HTTP Request', 4),
		],
	]);
	const nodeTypes = mockInstance(NodeTypes);
	const getDescription = (nodeType: string) => {
		const description = descriptions.get(nodeType);
		if (!description) throw new Error(`Unknown node type: ${nodeType}`);
		return description;
	};
	nodeTypes.getByName.mockImplementation(
		(nodeType) => ({ description: getDescription(nodeType) }) as INodeType,
	);
	nodeTypes.getByNameAndVersion.mockImplementation(
		(nodeType) => ({ description: getDescription(nodeType) }) as INodeType,
	);
}

describe('WorkflowBuilderV2Controller (curl-equivalent)', () => {
	mockInstance(Logger);

	let controller: WorkflowBuilderV2Controller;
	let service: WorkflowBuilderV2Service;
	let originalStartSession: WorkflowBuilderV2Service['startSession'];
	let originalConfirm: WorkflowBuilderV2Service['confirm'];
	const testUser = { id: 'test-user' } as User;

	beforeEach(() => {
		Container.reset();
		mockInstance(Logger);
		// AgentsBuilderSettingsService is injected by the service but isn't called
		// when tests pass `modelOverride`. Mock to avoid the database cascade.
		mockInstance(AgentsBuilderSettingsService);
		installNodeTypesFixture();
		service = Container.get(WorkflowBuilderV2Service);
		controller = Container.get(WorkflowBuilderV2Controller);
		originalStartSession = service.startSession.bind(service);
		originalConfirm = service.confirm.bind(service);
	});

	it('exposes the propose → pick → state loop via controller endpoints', async () => {
		// Wire scripted model into the service by intercepting startSession/confirm
		// so we can pass `modelOverride` without exposing it on the controller API.
		const model = buildScriptedModel([
			toolCallsResponse([
				{
					toolCallId: 'tc-update-1',
					toolName: 'update_task_list',
					input: {
						tasks: [
							{ id: 't1', title: 'Schedule trigger', status: 'active' },
							{ id: 't2', title: 'HTTP call', status: 'pending' },
						],
					},
				},
				{
					toolCallId: 'tc-propose-1',
					toolName: 'propose_nodes',
					input: {
						insertionPoint: { kind: 'fromStart' },
						candidates: [
							{
								nodeType: 'n8n-nodes-base.scheduleTrigger',
								version: 1,
								displayName: 'Schedule Trigger',
								parameters: { rule: { interval: [{ field: 'days' }] } },
								reason: 'Fires the workflow daily.',
							},
						],
					},
				},
			]),
			toolCallsResponse([
				{
					toolCallId: 'tc-update-2',
					toolName: 'update_task_list',
					input: {
						tasks: [
							{ id: 't1', title: 'Schedule trigger', status: 'done' },
							{ id: 't2', title: 'HTTP call', status: 'active' },
						],
					},
				},
				{
					toolCallId: 'tc-propose-2',
					toolName: 'propose_nodes',
					input: {
						insertionPoint: { kind: 'after', afterNodeId: '__last__' },
						candidates: [
							{
								nodeType: 'n8n-nodes-base.httpRequest',
								version: 4,
								displayName: 'HTTP Request',
								parameters: {},
								reason: 'Fetches data.',
							},
						],
					},
				},
			]),
			textResponse('All set.'),
		]);
		jest.spyOn(service, 'startSession').mockImplementation(async (input) => {
			return await originalStartSession({ ...input, modelOverride: model });
		});
		jest.spyOn(service, 'confirm').mockImplementation(async (input) => {
			return await originalConfirm({ ...input, modelOverride: model });
		});

		const projectId = 'proj-curl';
		const res = mock<Response>();

		// ── curl -X POST /projects/proj-curl/builder-v2/sessions
		//      -d '{"prompt":"Build a daily HTTP poller","workflowJson":{"nodes":[],"connections":{}}}'
		const startReq = mock<AuthenticatedRequest<{ projectId: string }>>();
		startReq.params = { projectId };
		startReq.user = testUser;
		const startResp = await controller.start(startReq, res, {
			prompt: 'Build a daily HTTP poller',
			workflowJson: { nodes: [], connections: {} },
		});
		// → 200 { sessionId: "<uuid>" }
		expect(startResp.sessionId).toBeTruthy();
		const sessionId = startResp.sessionId;

		// ── curl GET /projects/proj-curl/builder-v2/sessions/<id>/state
		const stateReq = mock<AuthenticatedRequest<{ projectId: string; id: string }>>();
		const s1 = await controller.state(stateReq, res, sessionId);
		// → 200 with two pending tasks and one proposed ghost
		expect(s1.taskList.map((t) => t.id)).toEqual(['t1', 't2']);
		expect(s1.ghosts?.[0]?.nodeType).toBe('n8n-nodes-base.scheduleTrigger');
		expect(s1.done).toBe(false);

		// ── curl -X POST /projects/proj-curl/builder-v2/sessions/<id>/confirm
		//      -d '{"kind":"pick","chosenIndex":0}'
		const confirmReq = mock<AuthenticatedRequest<{ projectId: string; id: string }>>();
		confirmReq.user = testUser;
		const confirmResp = await controller.confirm(confirmReq, res, sessionId, {
			kind: 'pick',
			chosenIndex: 0,
		});
		// → 200 { ok: true }
		expect(confirmResp.ok).toBe(true);

		// ── curl GET /projects/proj-curl/builder-v2/sessions/<id>/state
		const s2 = await controller.state(stateReq, res, sessionId);
		// → 200 with one committed schedule trigger and the next propose pending
		expect(s2.workflow.nodes.length).toBeGreaterThanOrEqual(1);
		expect(s2.workflow.nodes[0].type).toBe('n8n-nodes-base.scheduleTrigger');
		expect(s2.ghosts).not.toBeNull();
		expect(s2.taskList.find((t) => t.id === 't1')?.status).toBe('done');
		expect(s2.taskList.find((t) => t.id === 't2')?.status).toBe('active');

		// Optional: print a curl-equivalent trace for the developer log.
		if (process.env.BUILDER_V2_TRACE === '1') {
			/* eslint-disable no-console */
			console.log('── builder-v2 curl trace ──');
			console.log('POST /sessions →', JSON.stringify(startResp));
			console.log('GET  /sessions/:id/state →', JSON.stringify(s1, null, 2));
			console.log('POST /sessions/:id/confirm →', JSON.stringify(confirmResp));
			console.log('GET  /sessions/:id/state →', JSON.stringify(s2, null, 2));
			/* eslint-enable no-console */
		}
	});
});
