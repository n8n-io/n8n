import { isIntegrationMessageContext } from '../integration-message-context';

describe('isIntegrationMessageContext', () => {
	const context = {
		integrationConnectionId: 'slack:cred-a',
		platform: 'slack',
		target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
		updatedAt: '2026-05-18T10:00:00.000Z',
	};

	it('accepts the files that a run queued for its final reply', () => {
		expect(
			isIntegrationMessageContext({
				...context,
				queuedFiles: { runId: 'run-1', fileIds: ['file-1'] },
			}),
		).toBe(true);
	});

	it('rejects queued files with a wrong shape', () => {
		expect(
			isIntegrationMessageContext({ ...context, queuedFiles: { runId: 'run-1', fileIds: [1] } }),
		).toBe(false);
	});
});
