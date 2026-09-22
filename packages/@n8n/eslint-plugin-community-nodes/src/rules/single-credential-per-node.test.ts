import { RuleTester } from '@typescript-eslint/rule-tester';

import { SingleCredentialPerNodeRule } from './single-credential-per-node.js';

const ruleTester = new RuleTester();

function createNodeCode(
	credentials: string,
	properties = '[]',
	options: { className?: string; group?: string } = {},
): string {
	const { className = 'TestNode', group = 'output' } = options;
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ${className} implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['${group}'],
		version: 1,
		description: 'Test node',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: ${credentials},
		properties: ${properties},
	};
}`;
}

const alternativeCredentials = `[
	{
		name: 'testApi',
		required: true,
		displayOptions: { show: { authentication: ['apiKey'] } },
	},
	{
		name: 'testOAuth2Api',
		required: true,
		displayOptions: { show: { authentication: ['oAuth2'] } },
	},
]`;

const authenticationProperty = `[
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		options: [
			{ name: 'API Key', value: 'apiKey' },
			{ name: 'OAuth2', value: 'oAuth2' },
		],
		default: 'apiKey',
	},
]`;

ruleTester.run('single-credential-per-node', SingleCredentialPerNodeRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			filename: 'Test.node.ts',
			code: 'export class TestNode {}',
		},
		{
			name: 'file that is not a node file',
			filename: 'Test.ts',
			code: createNodeCode(`[
				{ name: 'testOAuth2Api', required: true },
				{ name: 'senderProfile', required: true },
			]`),
		},
		{
			name: 'node with one credential',
			filename: 'Test.node.ts',
			code: createNodeCode("[{ name: 'testApi', required: true }]"),
		},
		{
			name: 'alternative authentication methods use mutually exclusive literal values',
			filename: 'Test.node.ts',
			code: createNodeCode(alternativeCredentials, authenticationProperty),
		},
		{
			name: 'alternative authentication methods use mutually exclusive enum values',
			filename: 'Test.node.ts',
			code: `
enum AuthenticationType {
	ApiKey = 'apiKey',
	OAuth2 = 'oAuth2',
}
${createNodeCode(`[
	{
		name: 'testApi',
		displayOptions: { show: { authentication: [AuthenticationType.ApiKey] } },
	},
	{
		name: 'testOAuth2Api',
		displayOptions: { show: { authentication: [AuthenticationType.OAuth2] } },
	},
]`)}`,
		},
		{
			name: 'alternative authentication methods use mutually exclusive variables',
			filename: 'Test.node.ts',
			code: `
const API_KEY_AUTH = 'apiKey';
const OAUTH2_AUTH = 'oAuth2';
${createNodeCode(`[
	{
		name: 'testApi',
		displayOptions: { show: { authentication: [API_KEY_AUTH] } },
	},
	{
		name: 'testOAuth2Api',
		displayOptions: { show: { authentication: [OAUTH2_AUTH] } },
	},
]`)}`,
		},
		{
			name: 'trigger node can use concurrent credentials',
			filename: 'TestTrigger.node.ts',
			code: createNodeCode(
				`[
					{ name: 'outboundApi', required: true },
					{ name: 'webhookAuth', required: true },
				]`,
				'[]',
				{ className: 'TestTrigger', group: 'trigger' },
			),
		},
	],
	invalid: [
		{
			name: 'reports concurrent credentials (CE-2317 reproduction)',
			filename: 'Test.node.ts',
			code: createNodeCode(`[
				{ name: 'testOAuth2Api', required: true },
				{ name: 'senderProfile', required: true },
			]`),
			errors: [{ messageId: 'multipleCredentials' }],
		},
		{
			name: 'reports credentials with overlapping display options',
			filename: 'Test.node.ts',
			code: createNodeCode(`[
				{
					name: 'firstApi',
					displayOptions: { show: { authentication: ['apiKey', 'shared'] } },
				},
				{
					name: 'secondApi',
					displayOptions: { show: { authentication: ['shared', 'oAuth2'] } },
				},
			]`),
			errors: [{ messageId: 'multipleCredentials' }],
		},
		{
			name: 'reports disjoint conditions on a multi-options property',
			filename: 'Test.node.ts',
			code: createNodeCode(
				alternativeCredentials,
				authenticationProperty.replace("type: 'options'", "type: 'multiOptions'"),
			),
			errors: [{ messageId: 'multipleCredentials' }],
		},
		{
			name: 'reports conditions that contain unresolved expressions',
			filename: 'Test.node.ts',
			code: createNodeCode(`[
				{
					name: 'firstApi',
					displayOptions: { show: { authentication: [getAuthentication()] } },
				},
				{
					name: 'secondApi',
					displayOptions: { show: { authentication: ['oAuth2'] } },
				},
			]`),
			errors: [{ messageId: 'multipleCredentials' }],
		},
	],
});
