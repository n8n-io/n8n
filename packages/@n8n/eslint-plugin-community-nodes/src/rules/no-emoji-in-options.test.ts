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
		{
			name: 'imported node resource file without emoji',
			filename: '/tmp/nodes/GithubIssues/resources/issueComment/getAll.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const issueCommentOperations: INodeProperties[] = [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [{ name: 'Get Many', value: 'getAll' }],
						default: 'getAll',
					},
				];
			`,
		},
		{
			name: 'non-node class next to a node class in a .node.ts file is ignored',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

				export class Helper {
					description = { displayName: '🚀 Rocket' };
				}

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: 'Test Node',
						name: 'testNode',
						properties: [],
					};
				}
			`,
		},
		{
			name: 'name inside a routing.send.body payload is not a rendered label',
			filename: '/tmp/nodes/resources/create.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const createDescription: INodeProperties[] = [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						routing: { send: { type: 'body', property: 'payload', value: { name: '🚀 Rocket' } } },
					},
				];
			`,
		},
		{
			name: 'name inside a default object is not a rendered label',
			filename: '/tmp/nodes/resources/create.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const createDescription: INodeProperties = {
					displayName: 'Payload',
					name: 'payload',
					type: 'json',
					default: { name: '🚀 Rocket', displayName: '🚀 Rocket' },
				};
			`,
		},
		{
			name: 'name inside the value of an option is not a rendered label',
			filename: '/tmp/nodes/resources/sortOptions.ts',
			code: `
				import type { INodePropertyOptions } from 'n8n-workflow';

				export const sortOptions: INodePropertyOptions[] = [
					{ name: 'Newest', value: { name: '🚀 Rocket' } },
				];
			`,
		},
		{
			name: 'name inside a default object of a node class description is not a rendered label',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				displayName: 'Test Node',
				name: 'testNode',
				properties: [
					{
						displayName: 'Payload',
						name: 'payload',
						type: 'json',
						default: { name: '🚀 Rocket' },
						routing: { send: { type: 'body', property: 'payload', value: { name: '🚀 Rocket' } } },
					},
				],
			`),
		},
		{
			name: 'variable typed as INodePropertyRouting is not checked',
			filename: '/tmp/nodes/resources/routing.ts',
			code: `
				import type { INodePropertyRouting } from 'n8n-workflow';

				export const routing: INodePropertyRouting = {
					output: {
						postReceive: [{ type: 'set', properties: { name: '🚀 Rocket', displayName: '🚀 Rocket' } }],
					},
				};
			`,
		},
		{
			name: 'variable typed as INodeRequestSend is not checked',
			filename: '/tmp/nodes/resources/send.ts',
			code: `
				import type { INodeRequestSend } from 'n8n-workflow';

				export const send: INodeRequestSend = { type: 'body', property: 'name', value: '🚀 Rocket' };
				export const sends: INodeRequestSend[] = [{ property: '🚀 Rocket' }];
			`,
		},
		{
			name: 'properties and options keys inside routing are not followed',
			filename: '/tmp/nodes/resources/create.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const createDescription: INodeProperties[] = [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						routing: {
							output: {
								postReceive: [{ type: 'set', properties: { name: '🚀 Rocket' } }],
							},
							send: { options: [{ name: '🚀 Rocket' }], values: [{ displayName: '🚀 Rocket' }] },
						},
					},
				];
			`,
		},
		{
			name: 'search routing and validation inside a resource locator mode are not followed',
			filename: '/tmp/nodes/resources/resourceLocator.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const repository: INodeProperties = {
					displayName: 'Repository',
					name: 'repository',
					type: 'resourceLocator',
					default: { mode: 'list', value: '' },
					modes: [
						{
							displayName: 'From List',
							name: 'list',
							type: 'list',
							search: { send: { property: 'name', value: '🚀 Rocket' } },
							validation: [{ type: 'regex', properties: { name: '🚀 Rocket' } }],
						},
					],
				};
			`,
		},
		{
			name: 'resource locator mode names are internal identifiers',
			filename: '/tmp/nodes/resources/resourceLocator.ts',
			code: `
				export const repository: INodeProperties = {
					displayName: 'Repository',
					name: 'repository',
					type: 'resourceLocator',
					default: { mode: 'list🚀', value: '' },
					modes: [
						{ displayName: 'From List', name: 'list🚀', type: 'list' },
						...(flag ? [{ displayName: 'By URL', name: 'url🎉', type: 'string' }] : [
							{ ...({ displayName: 'By ID', name: 'id✅', type: 'string' } as const) },
						]),
					],
				};
			`,
		},
		{
			name: 'spreads and conditionals do not expose routing, default, or option value data as labels',
			filename: '/tmp/nodes/resources/create.ts',
			code: `
				export const field: INodeProperties = {
					...{
						displayName: 'Payload',
						name: 'payload',
						default: flag ? { name: '🚀' } : { displayName: '🎉' },
						routing: { ...{ properties: [{ name: '🚀' }] } },
						options: [...[{ name: 'Create', value: { ...{ name: '🎉' } } }]],
					},
				};
			`,
		},
		{
			name: 'keyof INodeProperties is not a node property value',
			filename: '/tmp/nodes/resources/keys.ts',
			code: `
				export const keys: (keyof INodeProperties)[] = [{ name: '🚀 Rocket' }];
				export const key: keyof INodeProperties = { displayName: '🚀 Rocket' };
			`,
		},
		{
			name: 'variable that is not typed as INodeProperties is ignored in a non .node.ts file',
			filename: '/tmp/helper.ts',
			code: `
				export const labels: Record<string, string>[] = [{ name: '🚀 Rocket' }];
				export const other = { displayName: '🚀 Rocket' };
			`,
		},
	],
	invalid: [
		{
			name: 'emoji in both branches of conditional options',
			filename: '/tmp/nodes/resources/operation.ts',
			code: `
				export const operation: INodeProperties = {
					displayName: 'Operation',
					name: 'operation',
					options: check({ name: '✅' })
						? [{ name: 'Create 🚀', value: 'create' }]
						: [{ name: 'Delete 🎉', value: 'delete' }],
				};
			`,
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'name', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'name', emoji: '🎉' } },
			],
		},
		{
			name: 'emoji in a conditional typed initializer',
			filename: '/tmp/nodes/resources/operation.ts',
			code: `
				export const operation: INodeProperties = flag
					? { displayName: 'Create 🚀', name: 'create' }
					: { displayName: 'Delete 🎉', name: 'delete' };
			`,
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🎉' } },
			],
		},
		{
			name: 'emoji in a static array spread',
			filename: '/tmp/nodes/resources/operation.ts',
			code: `
				export const fields: INodeProperties[] = [...[{
					displayName: 'Operation 🚀',
					name: 'operation',
					options: [...([{ name: 'Create 🎉', value: 'create' }] as const)],
				}]];
			`,
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'name', emoji: '🎉' } },
			],
		},
		{
			name: 'emoji in static object spreads in a node description',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeCode(`
				...{ displayName: 'Node 🚀' },
				properties: [{
					...{ options: [{ ...{ name: 'Create 🎉', value: 'create' } }] },
				}],
			`),
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'name', emoji: '🎉' } },
			],
		},
		{
			name: 'only mode displayName is checked through spreads and conditionals',
			filename: '/tmp/nodes/resources/resourceLocator.ts',
			code: `
				export const repository: INodeProperties = {
					displayName: 'Repository',
					name: 'repository',
					modes: (flag ? [...[{
						...{ displayName: 'From List 🚀', name: 'list✅', type: 'list' },
					}]] : [{ displayName: 'By URL 🎉', name: 'url✅', type: 'string' }]) satisfies INodePropertyMode[],
				};
			`,
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🎉' } },
			],
		},
		{
			name: 'emoji in option name from an imported node resource file',
			filename: '/tmp/nodes/GithubIssues/resources/issueComment/getAll.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const issueCommentOperations: INodeProperties = {
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					options: [
						{ name: '✅ Get Many', value: 'getAll' },
					],
					default: 'getAll',
				};
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } }],
		},
		{
			name: 'emoji in property displayName from an imported INodeProperties[] resource file',
			filename: '/tmp/nodes/GithubIssues/resources/issueComment/getAll.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const issueCommentDescription: INodeProperties[] = [
					{
						displayName: 'Limit 🚀',
						name: 'limit',
						type: 'number',
						default: 50,
					},
				];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in nested option name from an imported INodeProperties[] resource file',
			filename: '/tmp/nodes/GithubIssues/resources/issueComment/getAll.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const issueCommentDescription: INodeProperties[] = [
					{
						displayName: 'Additional Fields',
						name: 'additionalFields',
						type: 'collection',
						default: {},
						options: [
							{
								displayName: 'Sort',
								name: 'sort',
								type: 'options',
								options: [{ name: '✅ Newest', value: 'newest' }],
								default: 'newest',
							},
						],
					},
				];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } }],
		},
		{
			name: 'emoji in option name from an INodePropertyOptions[] resource file',
			filename: '/tmp/nodes/resources/sortOptions.ts',
			code: `
				import type { INodePropertyOptions } from 'n8n-workflow';

				export const sortOptions: INodePropertyOptions[] = [
					{ name: '✅ Newest', value: 'newest' },
					{ name: 'Oldest', value: 'oldest' },
				];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } }],
		},
		{
			name: 'emoji in a single INodePropertyOptions resource',
			filename: '/tmp/nodes/resources/sortOptions.ts',
			code: `
				export const newest: INodePropertyOptions = { name: '✅ Newest', value: 'newest' };
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } }],
		},
		{
			name: 'emoji in an INodePropertyCollection resource file',
			filename: '/tmp/nodes/resources/filters.ts',
			code: `
				import type { INodePropertyCollection } from 'n8n-workflow';

				export const filters: INodePropertyCollection = {
					displayName: 'Filter 🚀',
					name: 'filter',
					values: [{ displayName: 'Status', name: 'status', type: 'string', default: '' }],
				};
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in an INodePropertyCollection[] resource file',
			filename: '/tmp/nodes/resources/filters.ts',
			code: `
				export const filters: INodePropertyCollection[] = [
					{
						displayName: 'Filter',
						name: 'filter',
						values: [{ displayName: 'Status 🎉', name: 'status', type: 'string', default: '' }],
					},
				];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🎉' } }],
		},
		{
			name: 'emoji in an INodeTypeDescription from a versionDescription file',
			filename: '/tmp/nodes/Github/v1/actions/versionDescription.ts',
			code: `
				import type { INodeTypeDescription } from 'n8n-workflow';

				export const versionDescription: INodeTypeDescription = {
					displayName: '🚀 Github',
					name: 'github',
					properties: [
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							options: [{ name: '✅ Create', value: 'create' }],
							default: 'create',
						},
					],
				};
			`,
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
				{ messageId: 'emojiInOption', data: { key: 'name', emoji: '✅' } },
			],
		},
		{
			name: 'emoji in an INodeTypeDescription cast with `as` in a non .node.ts file',
			filename: '/tmp/nodes/Github/v1/actions/versionDescription.ts',
			code: `
				export const versionDescription = {
					displayName: '🚀 Github',
					name: 'github',
					properties: [],
				} as INodeTypeDescription;
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'each emoji is reported once in a .node.ts file with a class description and a typed variable',
			filename: '/tmp/TestNode.node.ts',
			code: `
				import type { INodeProperties, INodeType, INodeTypeDescription } from 'n8n-workflow';

				const extraProperties: INodeProperties[] = [
					{ displayName: 'Extra 🎉', name: 'extra', type: 'string', default: '' },
				];

				export class TestNode implements INodeType {
					description: INodeTypeDescription = {
						displayName: '🚀 Rocket Node',
						name: 'testNode',
						properties: extraProperties,
					};
				}
			`,
			errors: [
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🎉' } },
				{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } },
			],
		},
		{
			name: 'emoji is reported once for a typed variable nested in another typed variable',
			filename: '/tmp/nodes/resources/nested.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const outer: INodeProperties[] = (() => {
					const inner: INodeProperties[] = [
						{ displayName: 'Inner 🚀', name: 'inner', type: 'string', default: '' },
					];
					return inner;
				})();
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in a resource locator mode displayName',
			filename: '/tmp/nodes/resources/resourceLocator.ts',
			code: `
				import type { INodeProperties } from 'n8n-workflow';

				export const repository: INodeProperties = {
					displayName: 'Repository',
					name: 'repository',
					type: 'resourceLocator',
					default: { mode: 'list', value: '' },
					modes: [
						{ displayName: 'From List 🚀', name: 'list', type: 'list' },
						{ displayName: 'By URL', name: 'url', type: 'string' },
					],
				};
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in resource file typed as readonly INodeProperties[]',
			filename: '/tmp/nodes/resources/a.ts',
			code: `
				export const a: readonly INodeProperties[] = [{ displayName: '🚀 A', name: 'a' }];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in resource file typed as Array<INodeProperties>',
			filename: '/tmp/nodes/resources/a.ts',
			code: `
				export const a: Array<INodeProperties> = [{ displayName: '🚀 A', name: 'a' }];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in resource file cast with `as INodeProperties[]`',
			filename: '/tmp/nodes/resources/a.ts',
			code: `
				export const a = [{ displayName: '🚀 A', name: 'a' }] as INodeProperties[];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
		{
			name: 'emoji in resource file with `satisfies INodeProperties[]`',
			filename: '/tmp/nodes/resources/a.ts',
			code: `
				export const a = [{ displayName: '🚀 A', name: 'a' }] satisfies INodeProperties[];
			`,
			errors: [{ messageId: 'emojiInOption', data: { key: 'displayName', emoji: '🚀' } }],
		},
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
