/**
 * Integration coverage for the setup path: the workflows tool wired to the real
 * setup analysis, with only the n8n-facing services mocked.
 *
 * The unit tests either mock `analyzeWorkflow` (tool side) or call it directly
 * (service side), so neither would catch the wiring between them breaking —
 * which is exactly what INS-361 depends on.
 */
import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { createWorkflowsTool } from '../workflows.tool';

function createContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			getAsWorkflowJSON: vi.fn().mockResolvedValue({
				nodes: [
					{
						id: 'n1',
						name: 'Send Hello',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.7,
						parameters: { resource: 'message', operation: 'post' },
						position: [224, 0],
					},
				],
				connections: {},
			}),
			get: vi.fn().mockResolvedValue({ name: 'Morning Slack Hello' }),
		},
		credentialService: {
			list: vi.fn().mockResolvedValue([
				{ id: 'c1', name: 'Slack account', updatedAt: '2026-01-01T00:00:00.000Z' },
				{ id: 'c2', name: 'Slack account 2', updatedAt: '2026-01-02T00:00:00.000Z' },
				{ id: 'c3', name: 'Slack account 3', updatedAt: '2026-01-03T00:00:00.000Z' },
			]),
			test: vi.fn().mockResolvedValue({ success: true }),
		},
		nodeService: {
			getDescription: vi.fn().mockResolvedValue({ group: [], credentials: [{ name: 'slackApi' }] }),
		},
	} as unknown as InstanceAiContext;
}

async function openSetupCard(preferNewCredentials?: string[]) {
	const context = createContext();
	const suspend = vi.fn();
	await executeTool(
		createWorkflowsTool(context),
		{
			action: 'setup',
			workflowId: 'wf1',
			...(preferNewCredentials ? { preferNewCredentials } : {}),
		},
		{ suspend, resumeData: undefined } as never,
	);
	const payload = suspend.mock.calls[0]?.[0] as { setupRequests: Array<Record<string, unknown>> };
	return payload.setupRequests[0];
}

describe('workflows(action="setup") credential preselection', () => {
	it('marks the card as preferring a new credential when the user asked for one', async () => {
		const request = await openSetupCard(['slackApi']);

		expect(request.preferNewCredential).toBe(true);
		expect(request.isAutoApplied).toBeFalsy();
		expect(request.node).not.toHaveProperty('credentials');
		// The alternatives stay on offer in case the user changes their mind.
		expect(request.existingCredentials).toHaveLength(3);
	});

	it('leaves the card unmarked otherwise', async () => {
		const request = await openSetupCard();

		expect(request.preferNewCredential).toBeUndefined();
	});
});
