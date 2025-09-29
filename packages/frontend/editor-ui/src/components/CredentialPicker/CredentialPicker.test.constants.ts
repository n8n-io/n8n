import type { ICredentialMap, ICredentialTypeMap } from '@/Interface';

export const TEST_CREDENTIALS: ICredentialMap = {
	// OpenAI credential in personal
	1: {
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		id: '1',
		name: 'OpenAi account',
		data: 'test123',
		type: 'openAiApi',
		isManaged: false,
		homeProject: {
			id: '1',
			type: 'personal',
			name: 'Kobi Dog <kobi@n8n.io>',
			icon: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		sharedWithProjects: [
			{
				id: '2',
				type: 'team',
				name: 'Test Project',
				icon: { type: 'icon', value: 'arrow-left-right' },
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		scopes: [
			'credential:create',
			'credential:delete',
			'credential:list',
			'credential:move',
			'credential:read',
			'credential:share',
			'credential:update',
		],
	},
	// Supabase credential in another project
	2: {
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		id: '2',
		name: 'Supabase account',
		data: 'test123',
		type: 'supabaseApi',
		isManaged: false,
		homeProject: {
			id: '2',
			type: 'team',
			name: 'Test Project',
			icon: { type: 'icon', value: 'arrow-left-right' },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		sharedWithProjects: [],
		scopes: [
			'credential:create',
			'credential:delete',
			'credential:list',
			'credential:move',
			'credential:read',
			'credential:share',
			'credential:update',
		],
	},
	// Slack account in personal
	3: {
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		id: '3',
		name: 'Slack account',
		data: 'test123',
		type: 'slackOAuth2Api',
		isManaged: false,
		homeProject: {
			id: '1',
			type: 'personal',
			name: 'Kobi Dog <kobi@n8n.io>',
			icon: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		sharedWithProjects: [],
		scopes: [
			'credential:create',
			'credential:delete',
			'credential:list',
			'credential:move',
			'credential:read',
			'credential:share',
			'credential:update',
		],
	},
	// OpenAI credential in another project
	4: {
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		id: '4',
		name: '[PROJECT] OpenAI Account',
		data: 'test123',
		type: 'openAiApi',
		isManaged: false,
		homeProject: {
			id: '2',
			type: 'team',
			name: 'Test Project',
			icon: { type: 'icon', value: 'arrow-left-right' },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		sharedWithProjects: [],
		scopes: [
			'credential:create',
			'credential:delete',
			'credential:list',
			'credential:move',
			'credential:read',
			'credential:share',
			'credential:update',
		],
	},
};

export const TEST_CREDENTIAL_TYPES: ICredentialTypeMap = {
	openAiApi: {
		name: 'openAiApi',
		displayName: 'OpenAi',
		documentationUrl: 'openAi',
		properties: [
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: {
					password: true,
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Base URL',
				name: 'url',
				type: 'string',
				default: 'https://api.openai.com/v1',
				description: 'Override the base URL for the API',
			},
		],
		authenticate: {
			type: 'generic',
			properties: {
				headers: {
					Authorization: '=Bearer {{$credentials.apiKey}}',
				},
			},
		},
		test: {
			request: {
				baseURL: '={{$credentials?.url}}',
				url: '/models',
			},
		},
		iconUrl: {
			light: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openai.svg',
			dark: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openai.dark.svg',
		},
		supportedNodes: [
			'n8n-nodes-base.openAi',
			'@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			'@n8n/n8n-nodes-langchain.lmChatOpenAi',
			'@n8n/n8n-nodes-langchain.lmOpenAi',
		],
	},
	supabaseApi: {
		name: 'supabaseApi',
		displayName: 'Supabase API',
		documentationUrl: 'supabase',
		properties: [
			{
				displayName: 'Host',
				name: 'host',
				type: 'string',
				placeholder: 'https://your_account.supabase.co',
				default: '',
			},
			{
				displayName: 'Service Role Secret',
				name: 'serviceRole',
				type: 'string',
				default: '',
				typeOptions: {
					password: true,
				},
			},
		],
		authenticate: {
			type: 'generic',
			properties: {
				headers: {
					apikey: '={{$credentials.serviceRole}}',
					Authorization: '=Bearer {{$credentials.serviceRole}}',
				},
			},
		},
		test: {
			request: {
				baseURL: '={{$credentials.host}}/rest/v1',
				headers: {
					Prefer: 'return=representation',
				},
				url: '/',
			},
		},
		iconUrl: 'icons/n8n-nodes-base/dist/nodes/Supabase/supabase.svg',
		supportedNodes: ['n8n-nodes-base.supabase'],
	},
	slackOAuth2Api: {
		name: 'slackOAuth2Api',
		extends: ['oAuth2Api'],
		displayName: 'Slack OAuth2 API',
		documentationUrl: 'slack',
		properties: [
			{
				displayName: 'Grant Type',
				name: 'grantType',
				type: 'hidden',
				default: 'authorizationCode',
			},
			{
				displayName: 'Authorization URL',
				name: 'authUrl',
				type: 'hidden',
				default: 'https://slack.com/oauth/v2/authorize',
			},
			{
				displayName: 'Access Token URL',
				name: 'accessTokenUrl',
				type: 'hidden',
				default: 'https://slack.com/api/oauth.v2.access',
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'hidden',
				default: 'chat:write',
			},
			{
				displayName: 'Auth URI Query Parameters',
				name: 'authQueryParameters',
				type: 'hidden',
				default:
					'user_scope=channels:read channels:write chat:write files:read files:write groups:read im:read mpim:read reactions:read reactions:write stars:read stars:write usergroups:write usergroups:read users.profile:read users.profile:write users:read',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'hidden',
				default: 'body',
			},
			{
				displayName:
					'If you get an Invalid Scopes error, make sure you add the correct one <a target="_blank" href="https://docs.n8n.io/integrations/builtin/credentials/slack/#using-oauth">here</a> to your Slack integration',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
		iconUrl: 'icons/n8n-nodes-base/dist/nodes/Slack/slack.svg',
		supportedNodes: ['n8n-nodes-base.slack'],
	},
};

export const PERSONAL_OPENAI_CREDENTIAL = TEST_CREDENTIALS[1];
export const PROJECT_OPENAI_CREDENTIAL = TEST_CREDENTIALS[4];
