import { MicrosoftOAuth2Api } from 'n8n-nodes-base/dist/credentials/MicrosoftOAuth2Api.credentials';
import { MicrosoftTeamsOAuth2Api } from 'n8n-nodes-base/dist/credentials/MicrosoftTeamsOAuth2Api.credentials';
import { OAuth2Api } from 'n8n-nodes-base/dist/credentials/OAuth2Api.credentials';
import { MicrosoftTeams } from 'n8n-nodes-base/dist/nodes/Microsoft/Teams/MicrosoftTeams.node';
import path from 'node:path';

import { createTeamsChannelMessage } from '../../nodes/microsoft-teams/actions/channel-message.create';
import { createTeamsChatMessage } from '../../nodes/microsoft-teams/actions/chat-message.create';
import {
	describeFixtureParity,
	type AllowedDifference,
	type FixtureParity,
} from '../../../../nodes-core/src/__tests__/parity/harness';

const GRAPH = 'https://graph.microsoft.com';
const CHANNEL =
	'teams/61165b04-e4cc-4026-b43f-926b4e2a7182/channels/19:a1b2c3d4e5f6a7b8c9d0@thread.tacv2/messages';
const CHAT = `POST ${GRAPH}/v1.0/chats/19:ebed9ad42c904d6c83adf0db360053ec@thread.v2/messages #0`;
const POWERED_BY = '<br><br><em> Powered by <a href="';

const teams: FixtureParity = {
	fixturesDir: path.resolve(__dirname, '../../../fixtures'),
	nodeType: new MicrosoftTeams(),
	credential: {
		data: {
			grantType: 'authorizationCode',
			clientId: 'client',
			clientSecret: 'secret',
			accessTokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
			authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
			authentication: 'body',
			graphApiBaseUrl: GRAPH,
			oauthTokenData: { access_token: 'token-parity', token_type: 'Bearer' },
		},
		types: [new MicrosoftTeamsOAuth2Api(), new MicrosoftOAuth2Api(), new OAuth2Api()],
	},
};

/** The legacy node posts channel messages to the beta API; the action uses v1.0. */
const graphVersion = (tail: string): AllowedDifference[] =>
	['beta', 'v1.0'].map((version) => ({
		path: `requests.POST ${GRAPH}/${version}/${CHANNEL}${tail} #0`,
		kind: 'intended',
		reason: 'Microsoft does not support beta APIs in production, so the action posts to v1.0.',
	}));

describeFixtureParity(createTeamsChannelMessage, {
	...teams,
	cases: {
		'channel message': { allowed: graphVersion('') },
		'thread reply with attribution': {
			allowed: graphVersion('/1756717200000/replies'),
			check: (legacy, next) => {
				const reply = `/${CHANNEL}/1756717200000/replies #0`;
				expect(legacy.requests[`POST ${GRAPH}/beta${reply}`]?.body).toMatchObject({
					body: { contentType: 'html', content: expect.stringContaining('this n8n workflow') },
				});
				expect(next.requests[`POST ${GRAPH}/v1.0${reply}`]?.body).toEqual({
					body: {
						contentType: 'html',
						content: expect.stringContaining(`<b>Fixed</b>${POWERED_BY}https://n8n.io/`),
					},
				});
			},
		},
	},
});

describeFixtureParity(createTeamsChatMessage, {
	...teams,
	cases: {
		'text message with attribution': {
			allowed: [
				{
					path: `requests.${CHAT}.body.body.content`,
					kind: 'intended',
					reason:
						'The action links n8n.io: the run context has no instance URL, workflow ID or instance ID.',
				},
			],
			check: (legacy, next) => {
				expect(legacy.requests[CHAT]?.body).toMatchObject({
					body: { content: expect.stringContaining('this n8n workflow') },
				});
				expect(next.requests[CHAT]?.body).toEqual({
					body: {
						contentType: 'html',
						content: expect.stringContaining(`Build passed${POWERED_BY}https://n8n.io/`),
					},
				});
			},
		},
	},
});
