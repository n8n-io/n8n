import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { type INodeType, type INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

import { AgentsBuilderSettingsService } from '@/modules/agents/builder/agents-builder-settings.service';
import { NodeTypes } from '@/node-types';

import { formatInitialPrompt, WorkflowBuilderV2Service } from '../workflow-builder-v2.service';
import { BUILDER_V2_SYSTEM_PROMPT } from '../prompts/system-prompt';

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
		['n8n-nodes-base.set', makeNodeDescription('n8n-nodes-base.set', 'Set', 1)],
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

describe('WorkflowBuilderV2 smoke', () => {
	mockInstance(Logger);
	let service: WorkflowBuilderV2Service;
	const mockUser = { id: 'test-user' } as User;

	beforeEach(() => {
		Container.reset();
		mockInstance(Logger);
		// Settings service isn't exercised when `modelOverride` is provided, but DI
		// still needs to resolve it. Mock it to avoid the database cascade.
		mockInstance(AgentsBuilderSettingsService);
		installNodeTypesFixture();
		service = Container.get(WorkflowBuilderV2Service);
	});

	it('runs the propose → pick → commit loop end-to-end', async () => {
		const model = buildScriptedModel([
			toolCallsResponse([
				{
					toolCallId: 'tc-update-1',
					toolName: 'update_task_list',
					input: {
						tasks: [
							{ id: 't1', title: 'Trigger at 9am daily', status: 'active' },
							{ id: 't2', title: 'Send a message', status: 'pending' },
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
								parameters: {},
								reason: 'Fires the workflow on a cron schedule.',
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
							{ id: 't1', title: 'Trigger at 9am daily', status: 'done' },
							{ id: 't2', title: 'Send a message', status: 'active' },
						],
					},
				},
			]),
			toolCallsResponse([
				{
					toolCallId: 'tc-propose-2',
					toolName: 'propose_nodes',
					input: {
						insertionPoint: { kind: 'fromStart' },
						candidates: [
							{
								nodeType: 'n8n-nodes-base.set',
								version: 1,
								displayName: 'Set',
								parameters: {},
								reason: 'Build the message body.',
							},
						],
					},
				},
			]),
			textResponse('All tasks complete.'),
		]);

		const { sessionId } = await service.startSession({
			projectId: 'proj-1',
			prompt: 'build a daily message workflow',
			workflowJson: { nodes: [], connections: {} },
			user: mockUser,
			modelOverride: model,
		});

		expect(sessionId).toBeTruthy();

		// After first run: suspended on first propose, taskList populated.
		const s1 = service.getState(sessionId);
		expect(s1.taskList.length).toBeGreaterThan(0);
		expect(s1.ghosts).not.toBeNull();
		expect(s1.ghosts?.length ?? 0).toBeGreaterThanOrEqual(1);
		expect(s1.done).toBe(false);

		// Pick the first candidate. The agent then commits + proposes again.
		await service.confirm({
			sessionId,
			resume: { kind: 'pick', chosenIndex: 0 },
			user: mockUser,
			modelOverride: model,
		});

		const s2 = service.getState(sessionId);
		expect(s2.workflow.nodes.length).toBeGreaterThanOrEqual(1);
		expect(s2.workflow.nodes[0].type).toBe('n8n-nodes-base.scheduleTrigger');
		expect(s2.ghosts).not.toBeNull();
		expect(s2.done).toBe(false);
	});

	it('only uses single-node mode for existing-node canvas insertions', () => {
		const baseInput = {
			projectId: 'proj-1',
			prompt: 'build a daily message workflow',
			workflowJson: { nodes: [], connections: {} },
			user: mockUser,
		};

		expect(formatInitialPrompt(baseInput)).toContain('Build the requested workflow to completion');
		expect(formatInitialPrompt(baseInput)).not.toContain('Build exactly one next node');

		expect(
			formatInitialPrompt({
				...baseInput,
				requestedInsertionPoint: { kind: 'fromStart' },
			}),
		).toContain('Build the requested workflow to completion');

		expect(
			formatInitialPrompt({
				...baseInput,
				requestedInsertionPoint: { kind: 'after', afterNodeId: 'node-1' },
			}),
		).toContain('Build exactly one next node');
	});

	it('prompts the agent to offer provider options for generic service requests', () => {
		expect(BUILDER_V2_SYSTEM_PROMPT).toContain('Ambiguous service choices');
		expect(BUILDER_V2_SYSTEM_PROMPT).toContain('send an email');
		expect(BUILDER_V2_SYSTEM_PROMPT).toContain('Gmail, Microsoft Outlook, or SMTP/Email Send');
		expect(BUILDER_V2_SYSTEM_PROMPT).toContain('get_node_schemas');
		expect(BUILDER_V2_SYSTEM_PROMPT).toContain('Sub-node attachment rule');
		expect(BUILDER_V2_SYSTEM_PROMPT).toContain("Do NOT use a sub-node's id as `afterNodeId`");
	});
});
