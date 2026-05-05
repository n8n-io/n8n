import type { AgentCredentialIntegration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import type { Agent } from '../../entities/agent.entity';
import { ChatIntegrationService } from '../chat-integration.service';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: 'agent-1',
		projectId: 'project-1',
		integrations: [],
		publishedVersion: null,
		...overrides,
	} as unknown as Agent;
}

const slackIntegration: AgentCredentialIntegration = {
	type: 'slack',
	credentialId: 'cred-1',
	credentialName: 'Acme Slack',
};

describe('ChatIntegrationService.syncToConfig — publish gate', () => {
	let service: ChatIntegrationService;
	let connectSpy: jest.SpyInstance;
	let disconnectSpy: jest.SpyInstance;

	beforeEach(() => {
		service = new ChatIntegrationService(mockLogger(), mock(), mock(), mock(), mock(), mock());
		connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
		disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
	});

	it('skips connect when the agent is not published', async () => {
		const agent = makeAgent({ publishedVersion: null });

		await service.syncToConfig(agent, [], [slackIntegration]);

		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('still disconnects removed integrations even when the agent is not published', async () => {
		const agent = makeAgent({ publishedVersion: null });

		await service.syncToConfig(agent, [slackIntegration], []);

		expect(disconnectSpy).toHaveBeenCalledWith('agent-1', 'slack', 'cred-1');
		expect(connectSpy).not.toHaveBeenCalled();
	});
});

describe('ChatIntegrationService', () => {
	const logger = mock<Logger>();

	const buildService = () =>
		new ChatIntegrationService(logger, mock(), mock(), mock(), mock(), mock());

	describe('disconnectAll', () => {
		it('shuts down every active connection and empties the connection map', async () => {
			const service = buildService();
			const shutdownA = jest.fn().mockResolvedValue(undefined);
			const shutdownB = jest.fn().mockResolvedValue(undefined);
			const disposeA = jest.fn();
			const disposeB = jest.fn();

			// Seed two connections via the private map.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:slack:cred-1', {
				chat: {
					shutdown: shutdownA,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeA },
			});
			internal.connections.set('agent-2:telegram:cred-2', {
				chat: {
					shutdown: shutdownB,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeB },
			});

			await service.disconnectAll();

			expect(shutdownA).toHaveBeenCalledTimes(1);
			expect(shutdownB).toHaveBeenCalledTimes(1);
			expect(disposeA).toHaveBeenCalledTimes(1);
			expect(disposeB).toHaveBeenCalledTimes(1);
			expect(internal.connections.size).toBe(0);
		});

		it('does not throw when there are no active connections', async () => {
			const service = buildService();
			await expect(service.disconnectAll()).resolves.toBeUndefined();
		});

		it('continues disconnecting remaining connections when one shutdown rejects', async () => {
			const service = buildService();
			const shutdownA = jest.fn().mockRejectedValue(new Error('boom'));
			const shutdownB = jest.fn().mockResolvedValue(undefined);
			const disposeA = jest.fn();
			const disposeB = jest.fn();

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:slack:cred-1', {
				chat: {
					shutdown: shutdownA,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeA },
			});
			internal.connections.set('agent-2:telegram:cred-2', {
				chat: {
					shutdown: shutdownB,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeB },
			});

			await expect(service.disconnectAll()).resolves.toBeUndefined();

			expect(shutdownA).toHaveBeenCalledTimes(1);
			expect(shutdownB).toHaveBeenCalledTimes(1);
			expect(disposeA).toHaveBeenCalledTimes(1);
			expect(disposeB).toHaveBeenCalledTimes(1);
			expect(internal.connections.size).toBe(0);
		});
	});
});
