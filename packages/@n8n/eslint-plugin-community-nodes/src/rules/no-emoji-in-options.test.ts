import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoEmojiInOptionsRule } from './no-emoji-in-options.js';

const ruleTester = new RuleTester();

function createNodeCode(body: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				${body}
			};
		}
	`;
}

/**
 * Versioned node layout from the node-building docs: the version class assigns
 * `description` in its constructor instead of as a property initializer.
 */
function createVersionedNodeCode(body: string): string {
	return `
		import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

		export class TestNodeV1 implements INodeType {
			description: INodeTypeDescription;

			constructor(baseDescription: INodeTypeBaseDescription) {
				this.description = {
					...baseDescription,
					${body}
				};
			}
		}
	`;
}

ruleTester.run('no-emoji-in-options', NoEmojiInOptionsRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			filename: '/tmp/TestNode.node.ts',
			code: `
				export class NotANode {
					description = { displayName: '🚀 Rocket' };
				}
			`,
		},
		{
			name: 'non .node.ts file is ignored',
			filename: '/tmp/helper.ts',
			code: `
				export class TestNode {
					description = { displayName: '🚀 Rocket' };
				}
			`,
		},
		{
			name: 'node and option labels without emoji',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				defaults: { name: 'Test Node' },
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: 'Create', value: 'create' },
							{ name: 'Delete', value: 'delete' },
						],
						default: 'create',
					},
				],
			`),
		},
		{
			name: 'accented and non-latin characters are allowed',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Créer un café',
				name: 'testNode',
				properties: [
					{
						displayName: '日本語',
						name: 'field',
						type: 'string',
						default: '',
					},
				],
			`),
		},
	],
	invalid: [
		{
			name: 'emoji in option name of a versioned node assigning description in its constructor',
			filename: '/tmp/v1/TestNodeV1.node.ts',
			code: createVersionedNodeCode(`
				version: 1,
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: '✅ Create', value: 'create' },
							{ name: 'Delete', value: 'delete' },
						],
						default: 'create',
					},
				],
			`),
			errors: [{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } }],
		},
		{
			name: 'emoji in a description that is cast with `as`',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class TestNode implements INodeType {
					description = {
						displayName: '🚀 Rocket Node',
						name: 'testNode',
						properties: [],
					} as INodeTypeDescription;
				}
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in a constructor-assigned description that is cast with `as`',
			filename: '/tmp/v1/TestNodeV1.node.ts',
			code: `
				import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

				export class TestNodeV1 implements INodeType {
					description: INodeTypeDescription;

					constructor(baseDescription: INodeTypeBaseDescription) {
						this.description = {
							...baseDescription,
							displayName: '🚀 Rocket Node',
							properties: [],
						} as INodeTypeDescription;
					}
				}
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in node displayName',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: '🚀 Rocket Node',
				name: 'testNode',
				properties: [],
			`),
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in option name within options array',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{ name: '✅ Create', value: 'create' },
							{ name: 'Delete', value: 'delete' },
						],
						default: 'create',
					},
				],
			`),
			errors: [{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } }],
		},
		{
			name: 'emoji in property displayName',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'First Name 🙂',
						name: 'firstName',
						type: 'string',
						default: '',
					},
				],
			`),
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🙂' } }],
		},
		{
			name: 'flag emoji built from regional indicators',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Region 🇺🇸',
				name: 'testNode',
				properties: [],
			`),
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🇺 🇸' } }],
		},
		{
			name: 'multiple emoji values reported separately',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: '🚀 Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Field 🎉',
						name: 'field',
						type: 'string',
						default: '',
					},
				],
			`),
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🎉' } },
			],
		},
	],
});
