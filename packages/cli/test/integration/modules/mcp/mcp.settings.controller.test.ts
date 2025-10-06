import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { NodeConnectionTypes } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { createOwner } from '../../shared/db/users';
import type { SuperAgentTest } from '../../shared/types';
import { setupTestServer } from '../../shared/utils';

describe('McpSettingsController', () => {
	const testServer = setupTestServer({ endpointGroups: ['mcp', 'workflows'] });

	let owner: User;
	let ownerAgent: SuperAgentTest;
	let workflowRepository: WorkflowRepository;

	beforeEach(async () => {
		await testDb.truncate([
			'SharedWorkflow',
			'WorkflowEntity',
			'ProjectRelation',
			'Project',
			'User',
		]);

		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
		workflowRepository = Container.get(WorkflowRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const webhookWorkflowNodes = () => {
		const webhookNodeId = uuid();
		const setNodeId = uuid();
		return {
			nodes: [
				{
					id: webhookNodeId,
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
				},
				{
					id: setNodeId,
					name: 'Set',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					parameters: {},
					position: [380, 0],
				},
			],
			connections: {
				Webhook: {
					main: [[{ node: 'Set', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		};
	};

	describe('PATCH /mcp/workflows/:workflowId/toggle-access', () => {
		test('enables MCP access when workflow is active with an enabled webhook', async () => {
			const workflow = await createWorkflow(
				{
					...webhookWorkflowNodes(),
					active: true,
					settings: { timezone: 'Europe/Berlin' },
				},
				owner,
			);

			const response = await ownerAgent
				.patch(`/mcp/workflows/${workflow.id}/toggle-access`)
				.send({ availableInMCP: true })
				.expect(200);

			expect(response.body.data).toMatchObject({
				id: workflow.id,
				settings: expect.objectContaining({
					timezone: 'Europe/Berlin',
					availableInMCP: true,
				}),
			});

			const updated = await workflowRepository.findOneByOrFail({ id: workflow.id });
			expect(updated.settings).toMatchObject({
				timezone: 'Europe/Berlin',
				availableInMCP: true,
			});
		});

		test('rejects enabling MCP when workflow is inactive', async () => {
			const workflow = await createWorkflow(
				{
					...webhookWorkflowNodes(),
					active: false,
				},
				owner,
			);

			const response = await ownerAgent
				.patch(`/mcp/workflows/${workflow.id}/toggle-access`)
				.send({ availableInMCP: true })
				.expect(400);

			expect(response.body.message).toBe('Only active workflows can be made available in the MCP');
		});

		test('rejects enabling MCP when no active webhooks exist', async () => {
			const workflow = await createWorkflow(
				{
					nodes: [
						{
							id: uuid(),
							name: 'Start',
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							parameters: {},
							position: [0, 0],
						},
					],
					connections: {},
					active: true,
				},
				owner,
			);

			const response = await ownerAgent
				.patch(`/mcp/workflows/${workflow.id}/toggle-access`)
				.send({ availableInMCP: true })
				.expect(400);

			expect(response.body.message).toBe(
				'Only workflows with active webhooks can be made available in the MCP',
			);
		});

		test('disables MCP access without overwriting other settings', async () => {
			const workflow = await createWorkflow(
				{
					...webhookWorkflowNodes(),
					active: true,
					settings: { timezone: 'Europe/Berlin', saveManualExecutions: true },
				},
				owner,
			);

			await ownerAgent
				.patch(`/mcp/workflows/${workflow.id}/toggle-access`)
				.send({ availableInMCP: true })
				.expect(200);

			const disableResponse = await ownerAgent
				.patch(`/mcp/workflows/${workflow.id}/toggle-access`)
				.send({ availableInMCP: false })
				.expect(200);

			expect(disableResponse.body.data.settings).toMatchObject({
				timezone: 'Europe/Berlin',
				saveManualExecutions: true,
				availableInMCP: false,
			});

			const updated = await workflowRepository.findOneByOrFail({ id: workflow.id });
			expect(updated.settings).toMatchObject({
				timezone: 'Europe/Berlin',
				saveManualExecutions: true,
				availableInMCP: false,
			});
		});
	});
});
