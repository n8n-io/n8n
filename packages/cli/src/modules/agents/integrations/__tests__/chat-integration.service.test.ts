/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentCredentialIntegration } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import { ChatIntegrationService } from '../chat-integration.service';
import type { Agent } from '../../entities/agent.entity';

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
