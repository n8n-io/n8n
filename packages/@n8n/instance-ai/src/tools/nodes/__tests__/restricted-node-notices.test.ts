import { createRestrictedNodeNoticePublisher } from '../restricted-node-notices';

describe('createRestrictedNodeNoticePublisher', () => {
	const gmailTrigger = {
		name: 'n8n-nodes-base.gmailTrigger',
		displayName: 'Gmail Trigger',
		scope: 'instance' as const,
	};
	const slack = { name: 'n8n-nodes-base.slack', displayName: 'Slack', scope: 'project' as const };

	it('publishes one correctly populated event for each restricted type', () => {
		const publish = vi.fn();
		const publisher = createRestrictedNodeNoticePublisher({
			eventBus: { publish },
			threadId: 'thread-1',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
		});

		publisher('tc-1', [gmailTrigger, slack]);

		expect(publish).toHaveBeenCalledTimes(2);
		expect(publish).toHaveBeenNthCalledWith(1, 'thread-1', {
			type: 'restricted-node-notice',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
			payload: {
				toolCallId: 'tc-1',
				nodeType: 'n8n-nodes-base.gmailTrigger',
				displayName: 'Gmail Trigger',
				scope: 'instance',
			},
		});
		expect(publish).toHaveBeenNthCalledWith(
			2,
			'thread-1',
			expect.objectContaining({
				payload: expect.objectContaining({ nodeType: 'n8n-nodes-base.slack', scope: 'project' }),
			}),
		);
	});

	it('publishes nothing when no type is restricted', () => {
		const publish = vi.fn();

		createRestrictedNodeNoticePublisher({
			eventBus: { publish },
			threadId: 't',
			runId: 'r',
			agentId: 'a',
		})('tc-1', []);

		expect(publish).not.toHaveBeenCalled();
	});
});
