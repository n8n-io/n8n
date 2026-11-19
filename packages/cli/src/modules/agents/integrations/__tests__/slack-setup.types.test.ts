import { managedSlackAppCacheKey } from '../platforms/slack/slack-setup.types';

describe('managedSlackAppCacheKey', () => {
	it('builds the key both Slack setup services expect', () => {
		expect(
			managedSlackAppCacheKey({
				projectId: 'project-1',
				agentId: 'agent-1',
				managerCredentialId: 'manager',
				workspaceId: 'T123',
				userId: 'user-1',
			}),
		).toBe('agents:slack-managed-app:project-1:agent-1:manager:T123:user-1');
	});
});
