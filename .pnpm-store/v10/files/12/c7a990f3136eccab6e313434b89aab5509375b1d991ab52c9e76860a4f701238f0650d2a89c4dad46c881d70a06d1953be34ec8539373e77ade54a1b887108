import { SchemaType } from '../src';

export const INIT_AI_ASSISTANT_WITH_CODE_NODE_PAYLOAD = {
	payload: {
		role: 'user',
		type: 'init-error-helper',
		user: {
			firstName: 'ricardo',
		},
		error: {
			message: 'Unexpected identifier [line 6]',
			lineNumber: 6,
			description: 'SyntaxError',
		},
		node: {
			parameters: {
				mode: 'runOnceForAllItems',
				language: 'javaScript',
				jsCode:
					"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\ncons a = 123\n\nreturn $input.all();",
				notice: '',
			},
			id: 'a4c0aa5c-95b9-48f9-b5e9-8e332645e2b9',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [460, 460],
		},
		authType: {
			name: 'Cloud',
			value: 'cloud',
		},
		executionSchema: [
			{
				nodeName: 'Edit Fields',
				schema: {
					type: 'object',
					value: [
						{
							key: 'name',
							type: 'string',
							value: '',
							path: '.name',
						},
					],
					path: '',
				},
			},
		],
	},
};

export const ASK_AI_PAYLOAD = {
	question: 'how to print a message in the console that says hello ai?',
	context: {
		schema: [
			{
				nodeName: 'Edit Fields1',
				schema: {
					type: 'object' as SchemaType,
					value: [
						{
							key: 'name',
							type: 'string' as SchemaType,
							value: '',
							path: '.name',
						},
					],
					path: '',
				},
			},
		],
		inputSchema: {
			nodeName: 'Edit Fields',
			schema: {
				type: 'object' as SchemaType,
				value: [
					{
						key: 'name',
						type: 'string' as SchemaType,
						value: '',
						path: '.name',
					},
				],
				path: '',
			},
		},
		ndvPushRef: 'ndv-5ef2d82a-a451-4afa-b05e-50efebd18501',
		pushRef: '7tf0dl9ken',
	},
	forNode: 'code',
};

export const BUILDER_API_PROXY_TOKEN_PAYLOAD = {
	licenseCert: 'test-license-cert-123',
};

export const BUILDER_INSTANCE_CREDITS_PAYLOAD = {
	licenseCert: 'test-license-cert-123',
};
