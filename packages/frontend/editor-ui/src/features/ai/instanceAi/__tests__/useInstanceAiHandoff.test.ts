import { describe, expect, it } from 'vitest';

import {
	buildInstanceAiAgentPreviewHandoffContext,
	buildInstanceAiAgentPreviewQuestion,
	buildInstanceAiCredentialHandoffContext,
} from '../composables/useInstanceAiHandoff';

describe('useInstanceAiHandoff', () => {
	it('builds credential modal handoff context without empty optional fields', () => {
		expect(
			buildInstanceAiCredentialHandoffContext({
				credentialType: 'gmailOAuth2Api',
				displayName: 'Gmail OAuth2 API',
				nodeName: 'Gmail',
				nodeType: 'n8n-nodes-base.gmail',
				documentationUrl:
					'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
				oauthRedirectUrl: 'http://localhost:5678/rest/oauth2-credential/callback',
			}),
		).toEqual({
			source: 'credential-modal',
			credential: {
				credentialType: 'gmailOAuth2Api',
				displayName: 'Gmail OAuth2 API',
				nodeName: 'Gmail',
				nodeType: 'n8n-nodes-base.gmail',
				documentationUrl:
					'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
				oauthRedirectUrl: 'http://localhost:5678/rest/oauth2-credential/callback',
			},
		});
	});

	it('builds agent preview handoff context for a full preview session', () => {
		expect(
			buildInstanceAiAgentPreviewHandoffContext({
				agentId: 'agent-1',
				threadId: 'thread-1',
			}),
		).toEqual({
			source: 'agent-preview',
			agentId: 'agent-1',
			threadId: 'thread-1',
		});
	});

	it('builds the default opening question for agent preview handoff', () => {
		expect(buildInstanceAiAgentPreviewQuestion()).toBe(
			'Please review this preview session and improve the agent based on how it behaved.',
		);
	});
});
