import { versionsOf } from '@n8n/nodes-base-next';
import type { IDataObject, WorkflowJSON } from '@n8n/workflow-sdk';
import * as flowSdk from '@n8n/workflow-sdk/next';
import {
	NodeVersionNotFoundError,
	Workflow,
	type IConnections,
	type INode,
	type INodeTypeDescription,
	type INodeTypes,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiContext } from '../../../types';
import {
	aiNodeTypes,
	derivedNodeTypes,
	mattermostDescription,
} from '../../__tests__/derived-node-types';
import {
	contractEgressWarnings,
	EMPTY_OUTPUTS,
	fetchResourceFields,
	fixtureOriginsOf,
	sampledKeysOf,
	catalogProvidersOf,
	legacyNodeIssues,
	lockNodeContracts,
	modelCatalogFile,
	nextWorkspaceFiles,
	nodeOutputsDeclaration,
	staticInputIssues,
	synthesizedFixtures,
	FLOW_MACROS,
	tscHintOf,
	typecheckWorkflowSource,
	untypedNodeIssues,
	usedNodeIds,
	withTscHints,
	workflowExpressions,
} from '../next-workflow-build';

const source = `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { notion } from '@n8n/nodes/notion';
import { httpRequest } from "@n8n/nodes/httpRequest";`;

describe('next workflow build', () => {
	it('finds the node modules a source imports', () => {
		expect(usedNodeIds(source)).toEqual(['notion', 'httpRequest']);
	});

	it('generates the tsconfig and only the imported node modules', () => {
		const result = nextWorkspaceFiles(source);
		expect(result.ok && [...result.files.keys()]).toEqual([
			'tsconfig.next.json',
			'.n8n/node-outputs.d.ts',
			'.n8n/expressions.json',
			'.n8n/nodes/notion.ts',
			'.n8n/nodes/httpRequest.ts',
		]);
		expect(result.ok && result.files.get('.n8n/nodes/notion.ts')).toContain(
			'export const notion = {',
		);
	});

	it('types the model fields of the imported modules by the model catalog', async () => {
		const ai = `import { ai } from '@n8n/nodes/ai';
import { openAi } from '@n8n/nodes/openAi';
import { googleGemini } from '@n8n/nodes/googleGemini';`;
		expect(catalogProvidersOf(ai)).toEqual(['openai', 'google']);
		expect(catalogProvidersOf(source)).toEqual([]);
		const file = await modelCatalogFile(ai, async (provider) =>
			provider === 'openai' ? ['gpt-5', 'gpt-5-mini'] : undefined,
		);
		expect(file).toContain('openai: "gpt-5" | "gpt-5-mini";');
		expect(file).not.toContain('google');
		expect(await modelCatalogFile(source, async () => ['x'])).toBe('export {};\n');
	});

	it('names the typed modules when a source imports an unknown one', () => {
		expect(nextWorkspaceFiles("import { mattermost } from '@n8n/nodes/mattermost';")).toEqual({
			ok: false,
			errors: [expect.stringContaining('No node module "@n8n/nodes/mattermost"')],
		});
	});

	it('generates the derived module of an imported legacy node type at its path', () => {
		const derived = "import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';";
		const result = nextWorkspaceFiles(derived, { nodeTypesProvider: derivedNodeTypes() });
		const file = result.ok ? result.files.get('.n8n/nodes/n8n-nodes-base/mattermost.ts') : '';

		expect(usedNodeIds(derived)).toEqual(['n8n-nodes-base/mattermost']);
		expect(file).toMatch(/^\/\/\/ <reference path="\.\.\/\.\.\/node-outputs\.d\.ts" \/>\n/);
		expect(file).toContain('export const mattermost = {');
		expect(nextWorkspaceFiles(derived)).toEqual({
			ok: false,
			errors: [expect.stringContaining('No node module "@n8n/nodes/n8n-nodes-base/mattermost"')],
		});
	});

	it('declares derived output types by node name', () => {
		const workflow: WorkflowJSON = {
			name: 'Done',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Done tasks',
					type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						database: 'x',
						where: {
							match: 'all',
							conditions: [
								{
									property: 'Completed',
									type: 'date',
									condition: { op: 'on_or_after', value: '2026-09-01' },
								},
							],
						},
					},
				},
			],
		};
		const text = nodeOutputsDeclaration(workflow);
		expect(text).toContain('"Done tasks": {');
		expect(text).toContain('property_completed: {\n\t\t\t\tstart: string;');
		expect(synthesizedFixtures(workflow)['Done tasks']?.[0]).toMatchObject({
			property_completed: { start: '2026-09-15' },
		});
		const [sampled] =
			synthesizedFixtures(workflow, {
				'Done tasks': [{ id: 'mine', property_completed: { end: '2026-09-30' } }],
			})['Done tasks'] ?? [];
		expect(sampled).toMatchObject({
			id: 'mine',
			url: expect.any(String),
			property_completed: { start: '2026-09-15', end: '2026-09-30' },
		});
	});

	it('declares the Gmail attachments under binary with the prefix as the key type', () => {
		const workflow: WorkflowJSON = {
			name: 'Files',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Get',
					type: '@n8n/nodes-base-next.gmailMessageGet',
					typeVersion: 2,
					position: [0, 0],
					parameters: { messageId: 'm1', simplify: false, downloadAttachments: true },
				},
			],
		};
		const text = nodeOutputsDeclaration(workflow);
		const key = `\`attachment_${'$'}{number}\``;
		expect(text).toContain(`binary: {\n\t\t\t\t[key: ${key}]: Binary;\n\t\t\t};`);
		expect(text).not.toMatch(/^\t{3}\[key: `attachment_/m);
	});

	it('declares the status code of an HTTP request with fullResponse', () => {
		const workflow: WorkflowJSON = {
			name: 'Status',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Lookup',
					type: '@n8n/nodes-base-next.httpRequestGet',
					typeVersion: 3,
					position: [0, 0],
					parameters: { url: 'https://api.example.com/x', fullResponse: true, neverError: true },
				},
			],
		};
		const text = nodeOutputsDeclaration(workflow);
		expect(text).toContain('"Lookup": {');
		expect(text).toContain('statusCode: number;');
		const [lookup] = workflow.nodes;
		const plain = {
			...workflow,
			nodes: [{ ...lookup, parameters: { url: 'https://api.example.com/x' } }],
		};
		expect(nodeOutputsDeclaration(plain)).not.toContain('"Lookup"');
	});

	it('declares the nodes that continue on error, but not a routed step', () => {
		const step = (name: string, type: string, onError?: 'continueRegularOutput') => ({
			id: name,
			name,
			type,
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
			...(onError ? { onError } : {}),
		});
		const workflow: WorkflowJSON = {
			name: 'Continue',
			connections: {},
			nodes: [
				step('Post', '@n8n/nodes-base-next.httpRequestSend', 'continueRegularOutput'),
				step('Fields', 'n8n-nodes-base.set', 'continueRegularOutput'),
				step('Plain', '@n8n/nodes-base-next.httpRequestSend'),
				step('Exists', '@n8n/nodes-base-next.dataTableRowExists', 'continueRegularOutput'),
			],
		};
		const text = nodeOutputsDeclaration(workflow);
		expect(text).toContain(
			'\tinterface ContinuedNodes {\n\t\t"Post": true;\n\t\t"Fields": true;\n\t}',
		);
		expect(text).not.toContain('NodeOutputs');
		expect(
			nodeOutputsDeclaration({ ...workflow, nodes: [step('Plain', 'n8n-nodes-base.set')] }),
		).toBe(EMPTY_OUTPUTS);
	});

	const node = (name: string, type: string, parameters: IDataObject) => ({
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters,
	});

	it('lists the expressions and the Code node JavaScript of a built workflow', () => {
		const workflow: WorkflowJSON = {
			name: 'Lists',
			connections: {},
			nodes: [
				node('Get', '@n8n/nodes-base-next.gmailMessageGet', { messageId: '={{ $json.id }}' }),
				node('Set', '@n8n/nodes-base-next.itemsSet', {
					fields: { quoted: '={{ "={{ $json.id }}" }}', plain: 'text' },
				}),
				node('Code', 'n8n-nodes-base.code', { jsCode: 'return $input.all();' }),
				node('Python', 'n8n-nodes-base.code', { language: 'python', pythonCode: 'return []' }),
				node('Step', '@n8n/nodes-base-next.codeJavaScript', { code: 'return [{ n: 1 }];' }),
				node('Python step', '@n8n/nodes-base-next.codePython', { code: 'return []' }),
			],
		};
		expect(JSON.parse(workflowExpressions(workflow))).toEqual({
			expressions: ['={{ $json.id }}', '={{ "={{ $json.id }}" }}'],
			code: ['return $input.all();', 'return [{ n: 1 }];'],
		});
		expect(workflowExpressions({ ...workflow, nodes: [] })).toBe('{"expressions":[],"code":[]}\n');
	});

	it('reports a type check that does not complete', async () => {
		const run = async (result: { exitCode: number; stdout: string; stderr: string }) =>
			await typecheckWorkflowSource(
				{
					workspace: {
						filesystem: { provider: 'local', basePath: '/workspace' },
						sandbox: { executeCommand: vi.fn(async () => result) },
					},
					logger: { warn: vi.fn() },
				} as unknown as InstanceAiContext,
				'src/workflow.ts',
			);
		expect(
			await run({ exitCode: 0, stdout: '["src/workflow.ts(1,1): error"]\n', stderr: '' }),
		).toEqual({ errors: ['src/workflow.ts(1,1): error'] });
		expect(
			await run({
				exitCode: 124,
				stdout: '',
				stderr: 'Workflow diagnostics passed the 59000 ms deadline\n',
			}),
		).toEqual({
			errors: [],
			incomplete:
				'The type check did not complete (exit code 124). Call build-workflow again with the same filePath.\nWorkflow diagnostics passed the 59000 ms deadline',
		});
		expect(await run({ exitCode: 0, stdout: 'not json', stderr: '' })).toEqual({
			errors: [],
			incomplete:
				'The type check did not complete (exit code 0). Call build-workflow again with the same filePath.',
		});
	});

	it('notes a node() that a typed step or a flow step replaces, and names the step or the module', async () => {
		const source = `export default workflow('Legacy', manual(),
	node({ name: 'Mail', type: 'n8n-nodes-base.gmail', version: 2.1, parameters: {} }),
	node({ name: 'Labels', type: 'n8n-nodes-base.gmail', version: 2.1 }),
	node({ name: 'Keep', type: 'n8n-nodes-base.filter', version: 2.2 }),
	node({ name: 'Fetch', type: 'n8n-nodes-base.httpRequest', version: 4.2 }),
	node({ name: 'Ping', type: 'n8n-nodes-base.mattermost', version: 2.3 }),
	node({ name: 'Fields', type: 'n8n-nodes-base.set', version: 3.4 }),
	filter({ name: 'Region filter', if: (item) => item.ok }));`;
		const workflow: WorkflowJSON = {
			name: 'Legacy',
			connections: {},
			nodes: [
				node('Mail', 'n8n-nodes-base.gmail', { resource: 'message', operation: 'getAll' }),
				node('Labels', 'n8n-nodes-base.gmail', { resource: 'label', operation: 'getAll' }),
				node('Keep', 'n8n-nodes-base.filter', {}),
				node('Fetch', 'n8n-nodes-base.httpRequest', { method: 'GET' }),
				node('Ping', 'n8n-nodes-base.mattermost', {}),
				node('Fields', 'n8n-nodes-base.set', {}),
				node('Region filter', 'n8n-nodes-base.filter', {}),
			],
		};
		expect(await legacyNodeIssues(source, workflow)).toEqual([
			{
				code: 'CONTRACT_NODE_AVAILABLE',
				nodeName: 'Mail',
				severity: 'informational',
				message:
					'"Mail" is a legacy n8n-nodes-base.gmail node. Use the typed step gmail.message.getAll (import { gmail } from \'@n8n/nodes/gmail\') instead of node({ type }), unless the step lacks an option that this node needs.',
			},
			expect.objectContaining({
				nodeName: 'Keep',
				severity: 'informational',
				message: expect.stringContaining('Use the typed step condition.filter'),
			}),
			expect.objectContaining({
				nodeName: 'Fetch',
				severity: 'informational',
				message: expect.stringContaining(
					'has httpRequest.get, httpRequest.send, httpRequest.download',
				),
			}),
			expect.objectContaining({
				nodeName: 'Fields',
				severity: 'informational',
				message: expect.stringContaining('Use the flow step instead of node({ type }),'),
			}),
		]);
	});

	describe('staticInputIssues', () => {
		it('fails fixed values that the action rejects at run time, by node and field', () => {
			const workflow: WorkflowJSON = {
				name: 'Static',
				connections: {},
				nodes: [
					node('Pages', '@n8n/nodes-base-next.notionDatabasePageGetAll', {
						database: 'not-an-id',
						limit: 0,
					}),
					node('Mail', '@n8n/nodes-base-next.gmailMessageGetAll', {
						paging: { mode: 'limit', max: 0 },
					}),
					node('Mail text', '@n8n/nodes-base-next.gmailMessageGetAll', {
						paging: ' {"mode":"limit","max":0}',
					}),
				],
			};
			expect(staticInputIssues(workflow)).toEqual([
				expect.stringMatching(
					/^Node "Pages": input\.database: "not-an-id" is not Notion database ID/,
				),
				'Node "Pages": input.limit: must be at least 1',
				'Node "Mail": input.paging.max: must be at least 1',
				'Node "Mail text": input.paging.max: must be at least 1',
			]);
		});

		it('catches the R3 literal probes and reads a composed slot without its slot keys', () => {
			const workflow: WorkflowJSON = {
				name: 'Probes',
				connections: {},
				nodes: [
					node('B3', '@n8n/nodes-base-next.notionDatabasePageGetAll', {
						database: '<Notion tasks database ID>',
					}),
					node('B6 fraction', '@n8n/nodes-base-next.gmailMessageGetAll', {
						paging: { mode: 'limit', max: 2.5 },
					}),
					node('B6 zero', '@n8n/nodes-base-next.gmailMessageGetAll', {
						paging: { mode: 'limit', max: 0 },
					}),
					node('B8', '@n8n/nodes-base-next.googleSheetsSheetRead', {
						spreadsheet: '1abcdefghijklmnopqrstuvwxyz0123',
						sheet: { mode: 'id', id: 'Sheet1' },
					}),
					{
						...node('Composed', 'n8n-nodes-base.notion', {
							resource: 'databasePage',
							operation: 'getAll',
							database: '<Notion tasks database ID>',
						}),
						typeVersion: 4,
					},
				],
			};
			expect(staticInputIssues(workflow)).toEqual([
				expect.stringMatching(
					/^Node "B3": input\.database: "<Notion tasks database ID>" is not Notion database ID/,
				),
				'Node "B6 fraction": input.paging.max: must be integer, got 2.5',
				'Node "B6 zero": input.paging.max: must be at least 1',
				expect.stringMatching(/^Node "B8": input\.sheet\.id: "Sheet1" is not A numeric sheet gid/),
				expect.stringMatching(
					/^Node "Composed": input\.database: "<Notion tasks database ID>" is not Notion database ID/,
				),
			]);
		});

		it('tells how to get the ID when a resource ID field gets a name', () => {
			const workflow: WorkflowJSON = {
				name: 'Names',
				connections: {},
				nodes: [
					node('Add row', '@n8n/nodes-base-next.googleSheetsSheetAppend', {
						spreadsheet: 'Invoice Tracker 2026',
						sheet: { mode: 'id', id: 'Invoices' },
					}),
				],
			};
			expect(staticInputIssues(workflow)).toEqual([
				'Node "Add row": input.spreadsheet: "Invoice Tracker 2026" is not Spreadsheet ID or Google Sheets URL. Write its ID or URL, not its name: ask the user for the URL, or write placeholder(\'\u2026\') so that setup asks for it',
				expect.stringMatching(
					/^Node "Add row": input\.sheet\.id: "Invoices" is not A numeric sheet gid$/,
				),
			]);
		});

		it('checks the fixed values of a tool node and leaves its model fields to the tool', () => {
			const workflow: WorkflowJSON = {
				name: 'Tools',
				connections: {},
				nodes: [
					node('Pages', '@n8n/nodes-base-next.notionDatabasePageGetAllTool', {
						database: 'not-an-id',
						limit: "={{ $fromAi('limit') }}",
					}),
					node('Model pages', '@n8n/nodes-base-next.notionDatabasePageGetAllTool', {
						database: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('database') }}",
					}),
				],
			};
			expect(staticInputIssues(workflow)).toEqual([
				expect.stringMatching(
					/^Node "Pages": input\.database: "not-an-id" is not Notion database ID/,
				),
			]);
		});

		it('fails an expression in a binary field and takes the key of a binary of the item', () => {
			const send = (name: string, file: unknown) =>
				node(name, '@n8n/nodes-base-next.httpRequestSend', {
					method: 'POST',
					url: 'https://archive.example.com/api/upload',
					body: { kind: 'binary', file },
				});
			const workflow: WorkflowJSON = {
				name: 'Upload',
				connections: {},
				nodes: [send('Expression', '={{ $binary.data }}'), send('Key', 'data')],
			};
			expect(staticInputIssues(workflow)).toEqual([
				'Node "Expression": input.body.file: must be the key of a binary of the input item, e.g. "data". Write (item) => item.binary.data',
			]);
		});

		it('leaves expressions, placeholders, missing fields, and other nodes to the run', () => {
			const workflow: WorkflowJSON = {
				name: 'Later',
				connections: {},
				nodes: [
					node('Pages', '@n8n/nodes-base-next.notionDatabasePageGetAll', {
						database: '={{ $json.db }}',
						limit: '={{ $json.limit }}',
					}),
					node('User', '@n8n/nodes-base-next.notionUserGet', {
						user: '<__PLACEHOLDER_VALUE__Notion user ID__>',
					}),
					node('Mail', '@n8n/nodes-base-next.gmailMessageGet', {}),
					node('Other', 'n8n-nodes-base.noOp', { database: 'not-an-id' }),
				],
			};
			expect(staticInputIssues(workflow)).toEqual([]);
		});
	});

	describe('resource fields', () => {
		const databaseId = '0123456789abcdef0123456789abcdef';
		const tasks: WorkflowJSON = {
			name: 'Tasks',
			connections: {},
			nodes: [
				{
					id: '1',
					name: 'Tasks',
					type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
					typeVersion: 1,
					position: [0, 0],
					parameters: { database: `https://www.notion.so/Tasks-${databaseId}` },
				},
			],
		};
		const fields = [
			{ name: 'Status', value: 'Status|status' },
			{ name: 'Story Points', value: 'Story Points|number' },
		];

		const makeContext = (
			exploreResources: ReturnType<typeof vi.fn>,
			credentials = [{ id: 'c1', name: 'Notion account', type: 'notionApi' }],
			logger = { debug: vi.fn() },
			resourceLookupTimeoutMs?: () => Promise<number | undefined>,
		) =>
			({
				nodeService: { exploreResources, resourceLookupTimeoutMs },
				credentialService: { list: vi.fn().mockResolvedValue(credentials) },
				logger,
			}) as unknown as InstanceAiContext;
		const outcomeLogged = (logger: { debug: ReturnType<typeof vi.fn> }) =>
			logger.debug.mock.calls.find(
				([message]) => message === 'Resource lookup for a node contract',
			)?.[1];

		it('lists properties with the sole accepted credential, data source first, then database', async () => {
			const exploreResources = vi
				.fn()
				.mockRejectedValueOnce(new Error('Could not find data source'))
				.mockResolvedValueOnce({ results: fields });
			const logger = { debug: vi.fn() };
			const result = await fetchResourceFields(
				makeContext(exploreResources, undefined, logger),
				tasks,
			);
			expect(result.get('Tasks')).toEqual(fields);
			expect(outcomeLogged(logger)).toMatchObject({
				nodeName: 'Tasks',
				method: 'notion.dataSourceProperties',
				outcome: 'ok',
				fields: 2,
			});
			expect(exploreResources).toHaveBeenNthCalledWith(1, {
				nodeType: 'n8n-nodes-base.notion',
				version: 3,
				methodName: 'getFilterProperties',
				methodType: 'loadOptions',
				credentialType: 'notionApi',
				credentialId: 'c1',
				currentNodeParameters: {
					resource: 'databasePage',
					operation: 'getAll',
					dataSourceId: { __rl: true, mode: 'id', value: databaseId },
				},
			});
			expect(exploreResources.mock.calls[1]?.[0]).toMatchObject({
				version: 2.2,
				currentNodeParameters: { databaseId: { __rl: true, mode: 'id', value: databaseId } },
			});
		});

		it('skips the lookup when the database is an expression or holds no ID', async () => {
			const exploreResources = vi.fn();
			const withDatabase = (database: string): WorkflowJSON => ({
				...tasks,
				nodes: tasks.nodes.map((node) => ({ ...node, parameters: { database } })),
			});
			const context = makeContext(exploreResources);
			expect((await fetchResourceFields(context, withDatabase('={{ $json.db }}'))).size).toBe(0);
			expect((await fetchResourceFields(context, withDatabase('Tasks'))).size).toBe(0);
			expect(exploreResources).not.toHaveBeenCalled();
		});

		it('skips the lookup when more than one credential could be bound', async () => {
			const exploreResources = vi.fn();
			const logger = { debug: vi.fn() };
			const context = makeContext(
				exploreResources,
				[
					{ id: 'c1', name: 'Notion A', type: 'notionApi' },
					{ id: 'c2', name: 'Notion B', type: 'notionOAuth2Api' },
				],
				logger,
			);
			expect((await fetchResourceFields(context, tasks)).size).toBe(0);
			expect(exploreResources).not.toHaveBeenCalled();
			expect(outcomeLogged(logger)).toMatchObject({ outcome: 'no-credential' });
		});

		it('logs a lookup that the eval mock answered as mocked', async () => {
			const logger = { debug: vi.fn() };
			const exploreResources = vi.fn().mockResolvedValue({ results: fields, mocked: true });
			const result = await fetchResourceFields(
				makeContext(exploreResources, undefined, logger),
				tasks,
			);
			expect(result.get('Tasks')).toEqual(fields);
			expect(outcomeLogged(logger)).toMatchObject({ outcome: 'mocked' });
		});

		it('logs a lookup that every call failed as failed', async () => {
			const logger = { debug: vi.fn() };
			const exploreResources = vi.fn().mockRejectedValue(new Error('Authorization failed'));
			const result = await fetchResourceFields(
				makeContext(exploreResources, undefined, logger),
				tasks,
			);
			expect(result.size).toBe(0);
			expect(outcomeLogged(logger)).toMatchObject({ outcome: 'failed', fields: 0 });
		});

		it('gives up on a slow lookup after 5 seconds', async () => {
			vi.useFakeTimers();
			try {
				const logger = { debug: vi.fn() };
				const pending = fetchResourceFields(
					makeContext(
						vi.fn(async () => await new Promise(() => {})),
						undefined,
						logger,
					),
					tasks,
				);
				await vi.advanceTimersByTimeAsync(5_000);
				expect((await pending).size).toBe(0);
				expect(outcomeLogged(logger)).toMatchObject({ outcome: 'timeout' });
			} finally {
				vi.useRealTimers();
			}
		});

		it('waits as long as the node service asks for, and 5 seconds when it asks for no time', async () => {
			vi.useFakeTimers();
			try {
				const slowLookup = () =>
					vi.fn(
						async () =>
							await new Promise((resolve) =>
								setTimeout(() => resolve({ results: fields, mocked: true }), 30_000),
							),
					);
				const mocked = { debug: vi.fn() };
				const real = { debug: vi.fn() };
				const pending = Promise.all([
					fetchResourceFields(
						makeContext(slowLookup(), undefined, mocked, async () => 60_000),
						tasks,
					),
					fetchResourceFields(
						makeContext(slowLookup(), undefined, real, async () => undefined),
						tasks,
					),
				]);
				await vi.advanceTimersByTimeAsync(30_000);
				const [mockedFields, realFields] = await pending;
				expect(mockedFields.get('Tasks')).toEqual(fields);
				expect(outcomeLogged(mocked)).toMatchObject({ outcome: 'mocked' });
				expect(realFields.size).toBe(0);
				expect(outcomeLogged(real)).toMatchObject({ outcome: 'timeout' });
			} finally {
				vi.useRealTimers();
			}
		});

		it('closes the output type and seeds fixtures with real property names', () => {
			const resourceFields = new Map([['Tasks', fields]]);
			const text = nodeOutputsDeclaration(tasks, resourceFields);
			expect(text).toContain('property_story_points: number | null;');
			expect(text).not.toContain('[key: `property_');
			expect(synthesizedFixtures(tasks, {}, resourceFields).Tasks?.[0]).toMatchObject({
				property_status: 'example',
				property_story_points: 1,
			});
		});
	});

	describe('synthesizedFixtures local nodes', () => {
		const chain = (...names: string[]) =>
			Object.fromEntries(
				names
					.slice(0, -1)
					.map((name, index) => [
						name,
						{ main: [[{ node: names[index + 1], type: 'main', index: 0 }]] },
					]),
			);
		const pages: WorkflowJSON = {
			name: 'Pages',
			connections: chain('Get Pages', 'Keep Open', 'Build Rows', 'Shape', 'Summarize', 'Upsert'),
			nodes: [
				node('Get Pages', '@n8n/nodes-base-next.notionDatabasePageGetAll', { database: 'x' }),
				node('Keep Open', '@n8n/nodes-base-next.conditionFilter', {}),
				node('Build Rows', '@n8n/nodes-base-next.itemsSet', {
					fields: { Region: '={{ $json.property_region }}' },
				}),
				node('Shape', '@n8n/nodes-base-next.codeJavaScript', { code: 'return $input.all();' }),
				node('Summarize', '@n8n/nodes-base-next.openAiTextMessage', {
					model: 'gpt-5',
					prompt: 'Sum up',
				}),
				node('Upsert', '@n8n/nodes-base-next.googleSheetsSheetAppendOrUpdate', {
					values: { Summary: '={{ $json.text }}' },
				}),
			],
		};

		it('gives a fixture only to the nodes that call a service', () => {
			expect(Object.keys(synthesizedFixtures(pages))).toEqual(['Get Pages', 'Summarize', 'Upsert']);
		});

		it('names the origin of each fixture, and the keys that a filled sample gives', () => {
			const declared = { Hook: [{ body: {} }], Summarize: [{ text: 'Sum' }] };
			const resourceFields = new Map([['Get Pages', [{ name: 'Region', value: 'Region|select' }]]]);
			const fixtures = synthesizedFixtures(pages, declared, resourceFields);
			expect(fixtureOriginsOf(pages, fixtures, declared, resourceFields)).toEqual({
				Hook: 'sample',
				'Get Pages': 'lookup',
				Summarize: 'synthesized',
				Upsert: 'synthesized',
			});
			expect(sampledKeysOf(pages, declared)).toEqual({ Summarize: ['text'] });
		});

		it('runs a local node on its real input, not on its sample', () => {
			const fixtures = synthesizedFixtures(pages, { 'Build Rows': [{ Region: 'EU' }] });
			expect(fixtures).not.toHaveProperty('Build Rows');
			expect(fixtures).not.toHaveProperty('Keep Open');
		});

		it('adds the keys read behind a node that passes items on', () => {
			expect(synthesizedFixtures(pages)['Get Pages']?.[0]).toMatchObject({
				property_region: 'example property_region',
			});
		});
	});

	describe('synthesizedFixtures read keys', () => {
		const getAll = '@n8n/nodes-base-next.notionDatabasePageGetAll';
		const deals: WorkflowJSON = {
			name: 'Deals',
			connections: {
				'Get Deals': { main: [[{ node: 'Build Rows', type: 'main', index: 0 }]] },
				'Build Rows': { main: [[{ node: 'Upsert', type: 'main', index: 0 }]] },
				Upsert: { main: [[{ node: 'Report', type: 'main', index: 0 }]] },
			},
			nodes: [
				node('Get Deals', getAll, { database: 'x' }),
				node('Build Rows', '@n8n/nodes-base-next.itemsSet', {
					fields: {
						'Deal ID': '={{ $json.property_deal_id }}',
						Stage: '={{ $json["property_stage"] }}',
						Typo: '={{ $json.not_a_property }}',
					},
				}),
				node('Upsert', '@n8n/nodes-base-next.googleSheetsSheetAppendOrUpdate', {
					values: {
						'Deal ID': '={{ $json["Deal ID"] }}',
						Grandchild: '={{ $json.property_grandchild }}',
						Owner: "={{ $('Get Deals').first().json.property_owner }}",
						Amount: '={{ $("Get Deals").item.json["property_amount"] }}',
					},
				}),
				node('Report', '@n8n/nodes-base-next.itemsSet', {
					fields: { Row: '={{ $json.row_number }}' },
				}),
			],
		};

		it('adds the keys that later nodes read and that an open output allows', () => {
			const fixtures = synthesizedFixtures(deals);
			expect(fixtures['Get Deals']?.[0]).toMatchObject({
				property_deal_id: 'example property_deal_id',
				property_stage: 'example property_stage',
				property_owner: 'example property_owner',
				property_amount: 'example property_amount',
			});
			expect(fixtures['Get Deals']?.[0]).not.toHaveProperty('not_a_property');
			expect(fixtures['Get Deals']?.[0]).not.toHaveProperty('property_grandchild');
			expect(fixtures['Upsert']?.[0]).toMatchObject({ row_number: 'example row_number' });
			expect(fixtures).not.toHaveProperty('Build Rows');
		});

		it('keeps the closed key space of a resource lookup', () => {
			const resourceFields = new Map([['Get Deals', [{ name: 'Stage', value: 'Stage|select' }]]]);
			const [item] = synthesizedFixtures(deals, {}, resourceFields)['Get Deals'] ?? [];
			expect(item).toHaveProperty('property_stage');
			expect(item).not.toHaveProperty('property_deal_id');
		});

		it('resolves the Notion property read of a built Set node to a value', async () => {
			const { manual, node: anyNode, set, workflow } = await import('@n8n/workflow-sdk/next');
			const built = workflow(
				'Deals',
				manual(),
				anyNode({ name: 'Get Deals', type: getAll, version: 1, parameters: { database: 'x' } }),
				set({ name: 'Build Rows', fields: { 'Deal ID': (deal) => deal.property_deal_id } }),
			).toJSON();
			const rows = built.nodes.find(({ name }) => name === 'Build Rows');
			const raw = rows?.parameters?.fields;
			expect(raw).toEqual({ 'Deal ID': '={{ $json.property_deal_id }}' });

			const [item] = synthesizedFixtures(built)['Get Deals'] ?? [];
			const engine = new Workflow({
				nodes: built.nodes as INode[],
				connections: built.connections as IConnections,
				active: false,
				nodeTypes: mock<INodeTypes>(),
			});
			const resolved = engine.expression.getParameterValue(
				'={{ $json.property_deal_id }}',
				null,
				0,
				0,
				'Build Rows',
				[{ json: item as IDataObject }],
				'manual',
				{},
			);
			expect(resolved).toBe('example property_deal_id');
		});
	});

	describe('lockNodeContracts', () => {
		const nodes = [
			{
				id: '1',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
			},
			{
				id: '2',
				name: 'Get',
				type: '@n8n/nodes-base-next.notionDatabasePageGetAll',
				typeVersion: 1,
				position: [0, 0],
			},
		] as WorkflowJSON['nodes'];

		it('locks contract nodes by name to the bundled version', () => {
			const locked = lockNodeContracts({ name: 'wf', nodes, connections: {} });
			const [head] = versionsOf('notion.databasePage.getAll');
			const { semver, bundleHash, contractHash } = head.manifest;

			expect(locked.meta).toEqual({
				nodeContracts: {
					Get: { action: 'notion.databasePage.getAll', version: semver, bundleHash, contractHash },
				},
			});
		});

		it('locks a contract tool node to the version of its action', () => {
			const tool = {
				id: '3',
				name: 'Fetch',
				type: '@n8n/nodes-base-next.httpRequestGetTool',
				typeVersion: 3,
				position: [0, 0] as [number, number],
			};
			const locked = lockNodeContracts({ name: 'wf', nodes: [nodes[0], tool], connections: {} });
			const [head] = versionsOf('httpRequest.get');

			expect(locked.meta).toEqual({
				nodeContracts: {
					Fetch: {
						action: 'httpRequest.get',
						version: head.manifest.semver,
						bundleHash: head.manifest.bundleHash,
						contractHash: head.manifest.contractHash,
					},
				},
			});
		});

		it('leaves a workflow without contract nodes unchanged', () => {
			const workflow = { name: 'wf', nodes: [nodes[0]], connections: {} };
			expect(lockNodeContracts(workflow)).toBe(workflow);
		});

		it('locks the owned slot of a composed node by name, and no other slot', () => {
			const composed = (name: string, operation: string) => ({
				id: name,
				name,
				type: 'n8n-nodes-base.notion',
				typeVersion: 4,
				position: [0, 0] as [number, number],
				parameters: { resource: 'databasePage', operation, database: 'x' },
			});
			const workflow = {
				name: 'wf',
				nodes: [nodes[0], composed('Get', 'getAll'), composed('Create', 'create')],
				connections: {},
			};
			const [head] = versionsOf('notion.databasePage.getAll');

			expect(lockNodeContracts(workflow).meta).toEqual({
				nodeContracts: {
					Get: {
						action: 'notion.databasePage.getAll',
						version: head.manifest.semver,
						bundleHash: head.manifest.bundleHash,
						contractHash: head.manifest.contractHash,
					},
				},
			});
			expect(Object.keys(synthesizedFixtures(workflow))).toEqual(['Get']);
		});
	});

	describe('contract egress', () => {
		const getNode = (url: string, credentials: WorkflowJSON['nodes'][number]['credentials']) => ({
			id: '1',
			name: 'Fetch',
			type: '@n8n/nodes-base-next.httpRequestGet',
			typeVersion: 2,
			position: [0, 0] as [number, number],
			parameters: { authentication: 'httpHeaderAuth', url },
			credentials,
		});
		const workflowOf = (url: string): WorkflowJSON => ({
			name: 'wf',
			connections: {},
			nodes: [getNode(url, { httpHeaderAuth: { id: 'c1', name: 'Header account' } })],
		});
		const contextOf = (stored: Record<string, string> | undefined) =>
			({
				credentialService: {
					getAllowedHttpRequestDomains: vi.fn().mockResolvedValue(stored),
				},
			}) as unknown as InstanceAiContext;
		const DOMAINS = { allowedHttpRequestDomains: 'domains', allowedDomains: 'api.allowed.test' };

		it('fails a static URL whose host the credential does not allow, naming host and credential', async () => {
			expect(
				await contractEgressWarnings(contextOf(DOMAINS), workflowOf('https://other.test/x')),
			).toEqual([
				{
					code: 'CONTRACT_EGRESS',
					nodeName: 'Fetch',
					severity: 'error',
					message:
						'other.test is not an allowed host of the credential "Header account". Its hosts are: api.allowed.test',
				},
			]);
			expect(
				await contractEgressWarnings(contextOf(DOMAINS), workflowOf('https://api.allowed.test/x')),
			).toEqual([]);
		});

		it('warns for a URL expression, which n8n checks at run time', async () => {
			const [issue] = await contractEgressWarnings(
				contextOf(DOMAINS),
				workflowOf('={{ $json.url }}'),
			);
			expect(issue).toMatchObject({ severity: 'warning', nodeName: 'Fetch' });
		});

		it('fails a credential that refuses every request', async () => {
			const [issue] = await contractEgressWarnings(
				contextOf({ allowedHttpRequestDomains: 'none' }),
				workflowOf('https://api.allowed.test/x'),
			);
			expect(issue).toMatchObject({
				severity: 'error',
				message:
					'Credential "Header account": This credential is configured to prevent use within an HTTP Request node',
			});
		});

		it('does not check a credential without a limit or a node without a credential', async () => {
			expect(
				await contractEgressWarnings(contextOf(undefined), workflowOf('https://other.test/x')),
			).toEqual([]);
			const unbound = { name: 'wf', connections: {}, nodes: [getNode('https://other.test', {})] };
			expect(await contractEgressWarnings(contextOf(DOMAINS), unbound)).toEqual([]);
		});
	});
});

describe('tsc hints', () => {
	const at = 'src/workflows/main.workflow.ts(12,5): error ';
	const macros = ['steps', 'when', 'onError'];
	const methodHint =
		'A step has no methods. A workflow is a flat list: `workflow(name, trigger, stepA, stepB)`. Macros: steps, when, onError.';
	const missingFieldsHint =
		'Add the fields that the message names. `nodes(action="type-definition")` shows the full type.';
	const undefinedHint =
		"The value can be undefined. After a step with `onError: 'continueRegularOutput'`, check `item.error === undefined` first: then its output fields are set. A `schema` field is optional until its `required` list names it: add it there if the data always has it. Else give a default, e.g. `item.f ?? ''`.";
	const undefinedLambdaHint =
		"The lambda can return undefined, but the field takes no undefined. Give the missing case a value, e.g. `item.f ?? ''`. A field of an item can be missing: a file name of a `binary`, a webhook `schema` field without `required`, an output field of a failed item (`onError: 'continueRegularOutput'`).";
	const loopStateHint =
		'The loop state has the type of the item before `loop`, and `next` returns it. Put a `set` of only the state fields before `loop`. Then end the body with a `set` of the same fields, or return them from `next`.';

	it.each([
		[
			"TS2339: Property 'andThen' does not exist on type 'Step<unknown, unknown, HttpRequestGetOutput, \"Fetch\">'.",
			methodHint,
		],
		[
			'TS2339: Property \'onKept\' does not exist on type \'RoutedStep<unknown, unknown, unknown, "Only Text", "discarded" | "kept">\'.',
			methodHint,
		],
		[
			"TS2339: Property 'andThen' does not exist on type 'Trigger<Record<string, never>, \"Start\">'.",
			methodHint,
		],
		[
			"TS2559: Type '(flow: any) => any' has no properties in common with type 'Part<{ id: string; }, Record<\"Start\", {}>, unknown, unknown>'.",
			'A branch or a body takes one part: a step, a macro, or `steps(a, b)` for several. It is not a function.',
		],
		[
			"TS2559: Type '(Step<unknown, unknown, ExtractFromFilePdfOutput, \"Read PDF\"> | Step<...>)[]' has no properties in common with type 'Part<NoInfer<GmailTriggerTriggerOutput>, NoInfer<Record<...>>, unknown, unknown>'.",
			'A branch or a body takes one part. Put several parts in `steps(a, b)`, not in an array `[a, b]`.',
		],
		[
			'TS2554: Expected 1 arguments, but got 2.',
			"A step takes one object with its `name` in it: `node({ name: 'Fetch', type, version, parameters })`, not `node('Fetch', { … })`.",
		],
		[
			"TS2353: Object literal may only specify known properties, and 'caption' does not exist in type 'ValueSchema'.",
			"A `schema` is JSON Schema: type, properties, required, items, enum, description. Name each field in `properties`, e.g. `body: { type: 'object', properties: { caption: { type: 'string' } }, required: ['caption'] }`.",
		],
		[
			"TS2345: Argument of type '{ name: \"Until Approved\"; maxIterations: number; until: (out: unknown) => boolean; }' is not assignable to parameter of type 'LoopConfig<\"Until Approved\", unknown, unknown> & { next?: ((out: unknown, $: Dollar<unknown>) => never) | undefined; }'.\n  Property 'next' is missing in type '{ name: \"Until Approved\"; maxIterations: number; until: (out: unknown) => boolean; }' but required in type '{ next: (out: unknown, $: Dollar<unknown>) => NoInfer<{ approved: false; }>; }'.",
			'The loop body has no type, so `out` is `unknown`. A body takes one part: a step, a macro, or `steps(a, b)` for several, not an array `[a, b]`.',
		],
		[
			"TS2322: Type 'Step<unknown, unknown, { email: any; }, \"New\">' is not assignable to type 'never'.",
			'This key is no output name of the step in `route`, or no value of the `switchOn` field. Use a name that the type lists.',
		],
		[
			'TS2554: Expected 2-42 arguments, but got 43.',
			'`workflow()` takes 40 parts after the trigger, and `steps()` takes 20. Put the rest in a last `steps(…)`.',
		],
		[
			"TS2339: Property 'tableName' does not exist on type 'never'.",
			'This value has no fields. Items are plain JSON: write `item.field`, not `item.json.field`. Give the trigger `sample` items to type its fields.',
		],
		[
			"TS18046: 'item' is of type 'unknown'.",
			'This value has no type. Fix the first error before it first. Else type the node before it: a webhook or HTTP `schema`, `sample` items, or `returns` on a code step.',
		],
		[
			"TS2571: Object is of type 'unknown'.",
			'This value has no type. Fix the first error before it first. Else type the node before it: a webhook or HTTP `schema`, `sample` items, or `returns` on a code step.',
		],
		[
			"TS2322: The expression result does not fit the field: Type 'unknown' is not assignable to type 'string'.",
			'This value has no type. Fix the first error before it first. Else type the node before it: a webhook or HTTP `schema`, `sample` items, or `returns` on a code step.',
		],
		[
			"TS18046: 'item.client_numbers' is of type 'unknown'.",
			'This field has no declared type. Declare it where the data enters (a webhook or HTTP `schema`, `sample` items, or `returns` on a code step), or narrow it first, e.g. `Array.isArray(item.list)`.',
		],
		[
			"TS7006: Parameter 'failed' implicitly has an 'any' type.",
			'This lambda gets no parameter types: the field it fills or the value it maps has the type `any`. Give the step that outputs the value a webhook or HTTP `schema`, or `sample` items. For a field, use a typed step, e.g. the flow `set({ name, fields })`. Do not annotate the parameters.',
		],
		[
			"TS2322: Type '(item: { body: { severity?: string; }; }) => string | undefined' is not assignable to type 'string | ((item: { body: { severity?: string; }; }) => string)'.",
			undefinedHint,
		],
		[
			"TS2322: Type '(item: NoInfer<{ headers: { [key: string]: string; }; binary: { ...; }; body: Loose; }>) => string | undefined' is not assignable to type 'Value<NoInfer<{ ...; }>, NoInfer<Record<...>>, string> | undefined'.\n  Type 'string | undefined' is not assignable to type 'string'.\n    Type 'undefined' is not assignable to type 'string'.",
			undefinedLambdaHint,
		],
		[
			"TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.",
			undefinedHint,
		],
		[
			"TS2349: This expression is not callable.\n  Type 'Loose & FailedItem' has no call signatures.",
			"This value is not a function. A lambda gets the item first and `$` second: `(item, $) => $('Node').field`, not `($) => …`.",
		],
		[
			"TS2304: Cannot find name 'items_removeDuplicates'.",
			"`items` is a typed module: `import { items } from '@n8n/nodes/items'`. Call its steps as members, e.g. `items.removeDuplicates({ name, … })`.",
		],
		[
			"TS2304: Cannot find name 'slack'.",
			"`slack` is a typed module: `import { slack } from '@n8n/nodes/slack'`. Call its steps as members, e.g. `slack.<step>({ name, … })`.",
		],
		["TS18048: 'item.statusCode' is possibly 'undefined'.", undefinedHint],
		["TS2532: Object is possibly 'undefined'.", undefinedHint],
		[
			"TS2345: Argument of type '\"Incident Webhook\"' is not assignable to parameter of type 'never'.",
			"`$('Node')` reads only a node that runs before this one on the same path, by its exact `name`. If an earlier error breaks the list, fix it first.",
		],
		[
			"TS2740: Type '{ body: { id: string; }; }' is missing the following properties from type '{ headers: { [key: string]: string; }; body: Loose; }': headers, params, query, webhookUrl, and 2 more.",
			missingFieldsHint,
		],
		[
			"TS2322: Type '{ statusCode: number; body: { metrics: { employees: number; }; }; }' is not assignable to type '{ body: any; headers: { [key: string]: string; }; statusCode: number; } & { body: any; headers: { [x: string]: string; }; statusCode: number; }'.\n  Property 'headers' is missing in type '{ statusCode: number; body: { metrics: { employees: number; }; }; }' but required in type '{ body: any; headers: { [key: string]: string; }; statusCode: number; }'.",
			missingFieldsHint,
		],
		[
			"TS2305: Module '\"@n8n/workflow-sdk/next\"' has no exported member 'noOp'.",
			"`noOp` is a typed module, not part of the flow API: `import { noOp } from '@n8n/nodes/noOp'`. Call its steps as members, e.g. `noOp.pass({ name })`.",
		],
		[
			"TS2339: Property 'execute' does not exist on type '{ pass: <In, Ctx, const N extends string>(config: { name: N; sample?: In[] | undefined; settings?: NodeSettings | undefined; } & NoOpPassInput<In, Ctx>) => Step<In, Ctx, In, N>; }'.",
			'This typed module or resource has no step of this name. Call a step that its type lists, e.g. `.pass({ name })`. `nodes(action="type-definition")` shows them all.',
		],
		[
			"TS2349: This expression is not callable.\n  Type '{ pass: <In, Ctx, const N extends string>(config: { name: N; sample?: In[] | undefined; settings?: NodeSettings | undefined; } & NoOpPassInput<In, Ctx>) => Step<In, Ctx, In, N>; }' has no call signatures.",
			'A typed module is an object of steps, not a function. Call a step that its type lists, e.g. `.pass({ name })`. `nodes(action="type-definition")` shows them all.',
		],
		[
			"TS2339: Property 'post' does not exist on type '{ message: { send: <In, Ctx, const N extends string, S extends OutputOf<N, SlackMessageSendOutput> = OutputOf<N, SlackMessageSendOutput>>(config: { ...; }) => Step<...>; }; }'.",
			'This typed module or resource has no step of this name. Call a step that its type lists, e.g. `.message.send({ name })`. `nodes(action="type-definition")` shows them all.',
		],
		[
			'TS2345: Argument of type \'{ name: "Walk Org Chart"; maxIterations: number; until: (item: LoopStateSetOutput) => boolean; onLimit: "continue"; }\' is not assignable to parameter of type \'LoopConfig<"Walk Org Chart", LoopStateSetOutput, NoInfer<Record<"New Employee", { body: { ...; }; }>>>\'.\n  Property \'next\' is missing in type \'{ name: "Walk Org Chart"; maxIterations: number; until: (item: LoopStateSetOutput) => boolean; onLimit: "continue"; }\' but required in type \'{ next: (out: LoopStateSetOutput, $: Dollar<NoInfer<Record<"New Employee", { body: { ...; }; }>>>) => NoInfer<{ ...; }>; }\'.',
			loopStateHint,
		],
		[
			"TS2322: Type '(out: { ok: boolean; error: string; }) => { ok: boolean; error: string; }' is not assignable to type '(out: { ok: boolean; error: string; }, $: Dollar<NoInfer<Record<\"Event Received\", { headers: { [key: string]: string; }; body: { ...; }; }>>>) => ...'.\n  Type '{ ok: boolean; error: string; }' is missing the following properties from type '{ headers: { [key: string]: string; }; params: { [key: string]: string; }; body: { ...; }; }': headers, params, query, webhookUrl, and 3 more.",
			loopStateHint,
		],
		[
			"TS2353: Object literal may only specify known properties, and 'alwaysOutputData' does not exist in type '{ name: \"Get rows\"; type: string; }'.",
			'Remove this field, or use a field that the type lists: `nodes(action="type-definition")` shows them. Node settings that the type does not list are not available.',
		],
		[
			"TS2307: Cannot find module '@n8n/nodes/dataTable/row' or its corresponding type declarations.",
			'Import only `@n8n/workflow-sdk/next` and the typed modules `@n8n/nodes/<id>` that `nodes(action="search")` returns. Use `node({ type, version, parameters })` for other nodes.',
		],
		[
			"TS2305: Module '\"@n8n/nodes/slack\"' has no exported member 'slackSend'.",
			"A typed module exports one object named after its id, e.g. `import { slack } from '@n8n/nodes/slack'`. Its steps are members: `slack.message.send({ … })`.",
		],
		[
			"TS2305: Module '\"@n8n/workflow-sdk/next\"' has no exported member 'expr'.",
			"Import only the flow API that the skill names. Write an n8n expression as `expr('{{ … }}')`.",
		],
		[
			"TS2592: Cannot find name '$'. Do you need to install type definitions for jQuery?",
			"In a lambda, `$` is the second parameter: `(item, $) => $('Node').field`.",
		],
		[
			"TS2339: Property 'employees' does not exist on type '{}'.",
			"This field has no declared type, so `x ?? []` or a check such as `x ? x.f : \u2026` leaves `{}`, which has no fields. Give the node that outputs it a webhook or HTTP `schema`, `sample` items, or `returns` on a code step. Else narrow each level: `typeof x === 'object' && x !== null && 'f' in x`.",
		],
		[
			"TS2551: Property 'statusCod' does not exist on type '(FailedItem & { readonly body?: undefined; readonly statusCode?: undefined; }) | ({ body: any; statusCode: number; } & { ...; })'. Did you mean 'statusCode'?\n      Property 'statusCod' does not exist on type 'FailedItem & { readonly body?: undefined; readonly statusCode?: undefined; }'.",
			'The step before has no output field of this name. With `onError: \'continueRegularOutput\'`, an item is its output, or only `{ error }` when it fails on the item. Use a field that the output type lists: `nodes(action="type-definition")` shows them.',
		],
		[
			"TS2339: Property 'message' does not exist on type 'string'.",
			'The `error` of a failed item is the error message as text. Read `item.error`, not `item.error.message`.',
		],
		[
			"TS2339: Property 'organization' does not exist on type '{ enrichmentFailed: true; } | NoInfer<HttpRequestGetOutput>'.\n      Property 'organization' does not exist on type '{ enrichmentFailed: true; }'.",
			"The value has one of several shapes, e.g. after `recover` or `merge`, and only some have this field. Narrow it first: `'f' in item ? item.f : \u2026`. Or give every branch the field.",
		],
		[
			"TS2769: No overload matches this call.\n      The last overload gave the following error.\n        Object literal may only specify known properties, and 'config' does not exist in type 'NodeConfig<NoInfer<{ ...; }>, NoInfer<Record<...>>, string, Loose> & { ...; }'.",
			'`node()` takes one flat object: `node({ name, type, version, parameters, settings })`. Put the node parameters in `parameters`, not in `config`. Write `version`, not `typeVersion`.',
		],
		[
			"TS2322: Type 'Expr<\"{{ $binary.image }}\">' is not assignable to type '(item: NoInfer<{ binary: { ...; }; body: { ...; }; }>, $: Dollar<...>) => Binary'.",
			"`expr('{{ \u2026 }}')` fits a value field, not `if`, `until`, `next` or a binary field. Write a lambda here: `(item, $) => \u2026`.",
		],
		[
			'TS2322: Type \'Expr<"{{ $json.metrics?.employees != null }}">\' is not assignable to type \'(item: NoInfer<HttpRequestGetOutput>, $: Dollar<NoInfer<Record<"Lead Webhook", { executionMode: "production" | "test"; }>>>) =>...\'.',
			"`expr('{{ \u2026 }}')` fits a value field, not `if`, `until`, `next` or a binary field. Write a lambda here: `(item, $) => \u2026`.",
		],
		[
			"TS2339: Property 'group' does not exist on type 'Workflow'.",
			'A group is a part of the list: `group({ name, description }, steps(stepA, stepB))`. It frames its nodes on the canvas.',
		],
		[
			'TS2558: Expected 3 type arguments, but got 1.',
			'Remove the type arguments: a step infers its types. Give `node()` or `trigger()` `sample` items to type its output.',
		],
		[
			'TS2322: Type \'"continueErrorOutput"\' is not assignable to type \'"continueRegularOutput" | "stopWorkflow" | undefined\'.',
			"Do not set `onError: 'continueErrorOutput'`. Put `onError(part)` after the step: it takes the errors of the step and sets its error output.",
		],
		[
			"TS2339: Property 'settings' does not exist on type 'Workflow'.",
			"Workflow settings go in the first argument: `workflow({ name, settings: { errorWorkflow: '<id>' } }, trigger, \u2026)`.",
		],
	])('hints %s', (message, hint) => {
		expect(tscHintOf(`${at}${message}`, macros)).toBe(hint);
	});

	it.each([
		"TS2339: Property 'idd' does not exist on type '{ id: string; }'.",
		"TS2339: Property 'idd' does not exist on type '{ id: string | undefined; tags: (string | number)[]; }'.",
		"TS2769: No overload matches this call.\n  The last overload gave the following error.\n    Argument of type 'number' is not assignable to parameter of type 'string'.",
		"TS2322: Type 'string' is not assignable to type 'number'.",
		'TS2345: Argument of type \'"Strat"\' is not assignable to parameter of type \'"Get" | "Start"\'.',
		"TS2304: Cannot find name '$pageCount'.",
		"TS2304: Cannot find name 'orderTotal'.",
		"TS2322: Type '(item: { ok: boolean; }) => string' is not assignable to type '(out: { ok: boolean; }, $: Dollar<Record<\"Start\", {}>>) => boolean'.\n  Type 'string' is not assignable to type 'boolean'.",
		'n8n: Code cannot read process.',
	])('gives no hint for %s', (message) => {
		expect(tscHintOf(`${at}${message}`, macros)).toBeUndefined();
	});

	it('adds each hint once, after the first error it fits, with the real macros', async () => {
		const unknownItem = `${at}TS18046: 'item' is of type 'unknown'.`;
		const onStep = `${at}TS2339: Property 'orElse' does not exist on type 'Step<unknown, unknown, Loose, "Post">'.`;
		const [step, first, second] = withTscHints([onStep, unknownItem, unknownItem]);
		expect(step).toMatch(
			/^.+\nHint: A step has no methods\. .+ Macros: steps, route, when, .*onError, recover, group\.$/,
		);
		expect(first).toBe(`${unknownItem}\nHint: ${tscHintOf(unknownItem, [])}`);
		expect(second).toBe(unknownItem);
		const flowSdk = await import('@n8n/workflow-sdk/next');
		const exported = Object.entries(flowSdk).flatMap(([name, value]) =>
			typeof value === 'function' ? [name] : [],
		);
		expect(exported).toEqual(expect.arrayContaining([...FLOW_MACROS]));
	});

	it('leaves out implicit any parameters when another tsc error is present', () => {
		const overload = `${at}TS2769: No overload matches this call.\n  Object literal may only specify known properties, and 'config' does not exist in type 'NodeConfig<Loose>'.`;
		const implicitAny = `${at}TS7006: Parameter 'item' implicitly has an 'any' type.`;
		const expression = `${at.replace('error ', '')}n8n: Code cannot read process.`;

		expect(withTscHints([implicitAny, overload, implicitAny])).toEqual([
			`${overload}\nHint: ${tscHintOf(overload)}`,
		]);
		expect(withTscHints([implicitAny, expression])).toEqual([
			`${implicitAny}\nHint: ${tscHintOf(implicitAny)}`,
			expression,
		]);
	});

	it('adds the hints to the type check errors', async () => {
		const error = "src/workflow.ts(1,1): error TS7006: Parameter 'f' implicitly has an 'any' type.";
		const result = await typecheckWorkflowSource(
			{
				workspace: {
					filesystem: { provider: 'local', basePath: '/workspace' },
					sandbox: {
						executeCommand: vi.fn(async () => ({
							exitCode: 0,
							stdout: JSON.stringify([error]),
							stderr: '',
						})),
					},
				},
				logger: { warn: vi.fn() },
			} as unknown as InstanceAiContext,
			'src/workflow.ts',
		);
		expect(result.errors).toEqual([`${error}\nHint: ${tscHintOf(error, [])}`]);
	});
});

describe('untypedNodeIssues', () => {
	const MATTERMOST = 'n8n-nodes-base.mattermost';
	const AGENT = '@n8n/n8n-nodes-langchain.agentRoot';
	const CHAT = '@n8n/n8n-nodes-langchain.lmChatAcme';
	const httpDescription: INodeTypeDescription = {
		...mattermostDescription,
		displayName: 'HTTP Request',
		name: 'httpRequest',
		version: 4.2,
		credentials: [],
		properties: [
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'Credential Type',
				name: 'nodeCredentialType',
				type: 'credentialsSelect',
				default: '',
			},
		],
	};
	const vectorStoreDescription: INodeTypeDescription = {
		...mattermostDescription,
		displayName: 'Acme Vector Store',
		name: 'vectorStoreAcme',
		version: [1, 1.1],
		inputs: '={{ $parameter.mode === "retrieve" ? [] : ["main", "ai_embedding"] }}',
		outputs: '={{ $parameter.mode === "retrieve" ? ["ai_vectorStore"] : ["main"] }}',
		builderHint: {
			inputs: { ai_embedding: { required: true } },
			outputs: { main: {}, ai_vectorStore: {} },
		},
		properties: [{ displayName: 'Mode', name: 'mode', type: 'string', default: 'insert' }],
	};
	const embeddingDescription: INodeTypeDescription = {
		...mattermostDescription,
		displayName: 'Acme Embeddings',
		name: 'embeddingsAcme',
		version: 1,
		inputs: [],
		outputs: ['ai_embedding'],
		properties: [],
	};
	const context = (credentialTypes: string[] = []) => ({
		nodeTypesProvider: derivedNodeTypes(
			[mattermostDescription, httpDescription, vectorStoreDescription, embeddingDescription],
			aiNodeTypes,
		),
		credentialService: mock<InstanceAiContext['credentialService']>({
			credentialTypeExists: async (type: string) =>
				await Promise.resolve(credentialTypes.includes(type)),
		}),
	});

	const messages = (issues: Array<{ message: string }>) => issues.map(({ message }) => message);

	it('blocks a node() version that the node type does not have', async () => {
		const source = `workflow('W', manual(),
	node({ name: 'Post', type: '${MATTERMOST}', version: 9 }));`;
		const json = flowSdk
			.workflow('W', flowSdk.manual(), flowSdk.node({ name: 'Post', type: MATTERMOST, version: 9 }))
			.toJSON();
		expect(await untypedNodeIssues(source, json, context())).toEqual([
			{
				code: 'NODE_VERSION_NOT_FOUND',
				nodeName: 'Post',
				severity: 'warning',
				message: '"Post" (line 2): n8n-nodes-base.mattermost has no version 9. Versions: 2, 2.3.',
			},
		]);

		const versioned = context();
		versioned.nodeTypesProvider.getByNameAndVersion.mockImplementation(() => {
			throw new NodeVersionNotFoundError(MATTERMOST, 9, [1, 2]);
		});
		expect(messages(await untypedNodeIssues(source, json, versioned))).toEqual([
			'"Post" (line 2): n8n-nodes-base.mattermost has no version 9. Versions: 1, 2.',
		]);
	});

	it('warns about node() parameters that the node type does not have', async () => {
		const source = `workflow('W', manual(),
	node({ name: 'Post', type: '${MATTERMOST}', version: 2.3, parameters: { resource: 'message', mesage: 'Hi', bogus: 1 } }));`;
		const json = flowSdk
			.workflow(
				'W',
				flowSdk.manual(),
				flowSdk.node({
					name: 'Post',
					type: MATTERMOST,
					version: 2.3,
					parameters: { resource: 'message', mesage: 'Hi', bogus: 1 },
				}),
			)
			.toJSON();
		expect(await untypedNodeIssues(source, json, context())).toEqual([
			{
				code: 'UNKNOWN_PARAMETER',
				nodeName: 'Post',
				severity: 'informational',
				message:
					'"Post" (line 2): n8n-nodes-base.mattermost has no parameter "mesage" (did you mean "message"?), "bogus". Find its parameters with nodes(action="type-definition").',
			},
		]);
	});

	it('blocks a provider() that does not give its slot, and a slot that the root node does not have', async () => {
		const source = `workflow('W', manual(),
	node({ name: 'Agent', type: '${AGENT}', version: 1, providers: {
		model: provider({ name: 'Model', type: '${MATTERMOST}', version: 2.3 }) } }),
	node({ name: 'Post', type: '${MATTERMOST}', version: 2.3, providers: {
		model: provider({ name: 'Chat', type: '${CHAT}', version: 1.2 }) } }));`;
		const json = flowSdk
			.workflow(
				'W',
				flowSdk.manual(),
				flowSdk.node({
					name: 'Agent',
					type: AGENT,
					version: 1,
					providers: { model: flowSdk.provider({ name: 'Model', type: MATTERMOST, version: 2.3 }) },
				}),
				flowSdk.node({
					name: 'Post',
					type: MATTERMOST,
					version: 2.3,
					providers: { model: flowSdk.provider({ name: 'Chat', type: CHAT, version: 1.2 }) },
				}),
			)
			.toJSON();
		expect(await untypedNodeIssues(source, json, context())).toEqual([
			{
				code: 'PROVIDER_SLOT_MISMATCH',
				nodeName: 'Model',
				severity: 'warning',
				message:
					'"Model" (line 3): n8n-nodes-base.mattermost gives main, not ai_languageModel. It cannot be the model of "Agent".',
			},
			{
				code: 'PROVIDER_SLOT_MISMATCH',
				nodeName: 'Post',
				severity: 'warning',
				message:
					'"Post" (line 4): n8n-nodes-base.mattermost has no model slot (ai_languageModel). Its slots: none.',
			},
		]);
	});

	it('blocks a credential type that the instance does not have', async () => {
		const source = `workflow('W', manual(),
	node({ name: 'Fetch', type: 'n8n-nodes-base.httpRequest', version: 4.2, parameters: { url: 'https://api.acme.dev', nodeCredentialType: 'acmeApi' } }));`;
		const build = (nodeCredentialType: string) =>
			flowSdk
				.workflow(
					'W',
					flowSdk.manual(),
					flowSdk.node({
						name: 'Fetch',
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						parameters: { url: 'https://api.acme.dev', nodeCredentialType },
					}),
				)
				.toJSON();
		expect(await untypedNodeIssues(source, build('acmeApi'), context(['notionApi']))).toEqual([
			{
				code: 'CREDENTIAL_TYPE_NOT_FOUND',
				nodeName: 'Fetch',
				severity: 'warning',
				message:
					'"Fetch" (line 2): nodeCredentialType "acmeApi" is not a credential type of this instance. Find the type with credentials(action="search-types").',
			},
		]);
		expect(await untypedNodeIssues(source, build('notionApi'), context(['notionApi']))).toEqual([]);
	});

	it('keeps a node() of a vector store with its embedding provider clean', async () => {
		const source = `workflow('W', manual(),
	node({ name: 'Store', type: 'n8n-nodes-base.vectorStoreAcme', version: 1.1, parameters: { mode: 'insert' }, providers: {
		embedding: provider({ name: 'Embed', type: 'n8n-nodes-base.embeddingsAcme', version: 1 }) } }));`;
		const json = flowSdk
			.workflow(
				'W',
				flowSdk.manual(),
				flowSdk.node({
					name: 'Store',
					type: 'n8n-nodes-base.vectorStoreAcme',
					version: 1.1,
					parameters: { mode: 'insert' },
					providers: {
						embedding: flowSdk.provider({
							name: 'Embed',
							type: 'n8n-nodes-base.embeddingsAcme',
							version: 1,
						}),
					},
				}),
			)
			.toJSON();
		expect(await untypedNodeIssues(source, json, context())).toEqual([]);
	});
});
