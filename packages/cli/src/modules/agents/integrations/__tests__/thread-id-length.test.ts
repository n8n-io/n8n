import { encodeThreadId as encodeTeamsThreadId } from '@chat-adapter/teams';
import { AgentIntegrationSchema } from '@n8n/api-types';

import { AGENT_THREAD_ID_MAX_LENGTH } from '../types';

const INTEGRATION_TYPES = AgentIntegrationSchema.options.map((option) => option.shape.type.value);

const uuid = '0b6f3c52-8d1e-4a7b-9c2f-1e5d7a9b3c4d';
const snowflake = '1234567890123456789';

/**
 * The longest realistic platform thread id each integration stores, in the
 * format its chat adapter (or `formatThreadId.fromSdk`) produces. Add an entry
 * when you add an integration.
 */
const longestPlatformThreadId: Record<string, string> = {
	// A DM in a regional tenant, with the conversation type suffix.
	teams: encodeTeamsThreadId({
		conversationId: `a:1${'Xt9TpfmYq2Lr0kZbN4cVwHs8eUjG7dOaFyM3iRnK6lQxB5gS1vPzWuCo-_h2JmE4'.repeat(3)}`,
		serviceUrl: `https://smba.trafficmanager.net/emea/${uuid}/`,
		conversationType: 'groupChat',
	}),
	slack: 'slack:C0123456789ABCDEF:1731024000.123456',
	discord: `discord:${snowflake}:${snowflake}:${snowflake}`,
	telegram: 'chat:9999999999-telegram:-1009999999999:2147483647',
	whatsapp: 'whatsapp:999999999999999:999999999999999',
	linear: `linear:${uuid}:c:${uuid}:s:${uuid}`,
};

describe('agent thread id length', () => {
	it.each(INTEGRATION_TYPES)('%s thread ids fit the thread id columns', (integrationType) => {
		const platformThreadId = longestPlatformThreadId[integrationType];
		expect(platformThreadId).toBeDefined();
		// `<agentId>:<platform thread id>#<session generation>`
		const agentThreadId = `${uuid}:${platformThreadId}#999999`;

		expect(agentThreadId.length).toBeLessThanOrEqual(AGENT_THREAD_ID_MAX_LENGTH);
	});

	it('covers a Teams id longer than the old 255 character columns', () => {
		expect(longestPlatformThreadId.teams.length).toBeGreaterThan(255);
	});
});
