import {
	inheritIntegrationMessageContext,
	isIntegrationMessageContext,
	parseIntegrationConnectionId,
	replyRouteOf,
} from '../integration-message-context';
import type { IntegrationMessageContext } from '../integration-tool-types';

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

describe('parseIntegrationConnectionId', () => {
	it.each([
		['slack:cred-a', { platform: 'slack', credentialId: 'cred-a' }],
		['slack', { platform: 'slack', credentialId: undefined }],
		[undefined, { platform: undefined, credentialId: undefined }],
	])('splits %s', (connectionId, expected) => {
		expect(parseIntegrationConnectionId(connectionId)).toEqual(expected);
	});
});

describe('replyRouteOf', () => {
	const context: IntegrationMessageContext = {
		integrationConnectionId: 'slack:cred-a',
		platform: 'slack',
		target: { type: 'thread', threadId: 'slack:C1:1' },
		updatedAt: '2026-05-18T10:00:00.000Z',
	};

	it('prefers the reply target over the message target', () => {
		const replyTarget = { type: 'thread' as const, threadId: 'slack:C1:2' };
		expect(replyRouteOf({ ...context, replyTarget }, 'slack')).toEqual({
			credentialId: 'cred-a',
			threadId: 'slack:C1:2',
		});
	});

	it.each([
		['there is no context', null, 'slack'],
		['the context is for another platform', context, 'discord'],
		[
			'the connection is for another platform',
			{ ...context, integrationConnectionId: 'discord:cred-a' },
			'slack',
		],
		['the connection has no credential', { ...context, integrationConnectionId: 'slack' }, 'slack'],
		[
			'the target has no thread',
			{ ...context, target: { type: 'channel' as const, channelId: 'C1' } },
			'slack',
		],
	])('has no route when %s', (_case, value, integrationType) => {
		expect(replyRouteOf(value, integrationType)).toBeUndefined();
	});
});

describe('inheritIntegrationMessageContext', () => {
	const context: IntegrationMessageContext = {
		integrationConnectionId: 'slack:cred-a',
		platform: 'slack',
		target: { type: 'thread', threadId: 'slack:C123:123.456', channelId: 'slack:C123' },
		updatedAt: '2026-05-18T10:00:00.000Z',
	};

	it('keeps the files that the run queued before', () => {
		const queuedFiles = { runId: 'run-1', fileIds: ['file-1'] };

		expect(
			inheritIntegrationMessageContext(context, { ...context, queuedFiles }).queuedFiles,
		).toEqual(queuedFiles);
	});
});
