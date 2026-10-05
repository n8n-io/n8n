import { execFile } from 'node:child_process';
import {
	mkdir,
	mkdtemp,
	readFile,
	realpath,
	rename,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { packInstalledPackage } from '../../../workspace/pack-installed-package';
import { BUILD_MJS, TSCONFIG_JSON } from '../../../workspace/sandbox-setup';
import {
	loadWorkflowDiagnosticsWorker,
	WORKFLOW_DIAGNOSTICS_FILENAME,
} from '../../../workspace/sandbox-typescript';
import { createWorkflowsTool } from '../../workflows.tool';
import { compileWorkflowSource } from '../workflow-source-compiler';

const exec = promisify(execFile);

const packageDir = (name: string, from = __filename) =>
	dirname(require.resolve(`${name}/package.json`, { paths: [dirname(from)] }));

/** The sandbox workspace on the local disk: real tsx, TypeScript 7, and packed packages. */
async function createWorkspace(): Promise<{ root: string; context: InstanceAiContext }> {
	// The real path: the check compares file names with the working directory, as the sandbox has.
	const root = await realpath(await mkdtemp(join(tmpdir(), 'next-expression-check-')));
	await mkdir(join(root, 'node_modules/@n8n'), { recursive: true });
	await mkdir(join(root, 'node_modules/@types'), { recursive: true });
	await mkdir(join(root, 'src'));
	const expressionTypes = packageDir('@n8n/expression-types');
	const links: Array<[string, string]> = [
		['tsx', packageDir('tsx')],
		['typescript', packageDir('typescript')],
		['@types/node', packageDir('@types/node')],
		['@n8n/workflow-sdk', packageDir('@n8n/workflow-sdk')],
		['@types/luxon', packageDir('@types/luxon', join(expressionTypes, 'package.json'))],
	];
	await Promise.all(
		links.map(async ([name, target]) => await symlink(target, join(root, 'node_modules', name))),
	);
	// The sandbox installs this package from the tarball the host packs.
	const packed = await packInstalledPackage(expressionTypes);
	const tarball = join(root, packed.filename);
	await writeFile(tarball, packed.tarball);
	await mkdir(join(root, 'node_modules/@n8n/expression-types'));
	await exec('tar', [
		'-xzf',
		tarball,
		'-C',
		join(root, 'node_modules/@n8n/expression-types'),
		'--strip-components=1',
	]);
	await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
	await writeFile(join(root, 'tsconfig.json'), TSCONFIG_JSON);
	await writeFile(join(root, 'build.mjs'), BUILD_MJS);
	await writeFile(join(root, WORKFLOW_DIAGNOSTICS_FILENAME), await loadWorkflowDiagnosticsWorker());

	const resolve = (path: string) => (isAbsolute(path) ? path : join(root, path));
	const workspace = {
		filesystem: {
			provider: 'local',
			basePath: root,
			readFile: async (path: string) => await readFile(resolve(path), 'utf8'),
			writeFile: async (path: string, content: string | Buffer) => {
				await mkdir(dirname(resolve(path)), { recursive: true });
				await writeFile(resolve(path), content);
			},
			mkdir: async (path: string) => {
				await mkdir(resolve(path), { recursive: true });
			},
		},
		sandbox: {
			executeCommand: async (command: string, _args: string[], options?: { cwd?: string }) =>
				await exec('/bin/sh', ['-c', command], { cwd: options?.cwd ?? root, timeout: 60_000 })
					.then(({ stdout, stderr }) => ({ exitCode: 0, stdout, stderr }))
					.catch((error: { code?: number; stdout?: string; stderr?: string }) => ({
						exitCode: error.code ?? 1,
						stdout: error.stdout ?? '',
						stderr: error.stderr ?? '',
					})),
		},
	};
	const context = {
		userId: 'user-1',
		nodeContractsEnabled: true,
		workspace,
		workflowService: {},
		credentialService: { list: async () => [] },
		nodeService: {},
		dataTableService: {},
		executionService: {},
		logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
	} as unknown as InstanceAiContext;
	return { root, context };
}

/** `src/workflow.ts(line,column)` of the first character of `needle` in `source`. */
function at(source: string, needle: string, offset = 0): string {
	const index = source.indexOf(needle);
	expect(index).toBeGreaterThan(-1);
	const before = source.slice(0, index + offset).split('\n');
	return `src/workflow.ts(${before.length},${(before.at(-1)?.length ?? 0) + 1})`;
}

const SAMPLE = "[{ id: '182b676d244938bd', subject: 'Hi', count: 3 }]";

const pathWarnings = (result: Awaited<ReturnType<typeof compileWorkflowSource>>) =>
	result.success
		? result.warnings
				.filter((warning) => warning.code.endsWith('EXPRESSION_PATH'))
				.map((warning) => warning.message)
		: result.errors;

const sampledReads = (result: Awaited<ReturnType<typeof compileWorkflowSource>>) =>
	result.success
		? result.warnings
				.filter((warning) => warning.code === 'SAMPLE_PINS_READ')
				.map((warning) => warning.nodeName)
		: result.errors;

describe('n8n expressions in the node contracts build', () => {
	let root: string;
	let context: InstanceAiContext;

	beforeAll(async () => {
		({ root, context } = await createWorkspace());
	}, 60_000);

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	async function build(source: string) {
		await writeFile(join(root, 'src/workflow.ts'), source);
		return await compileWorkflowSource(context, 'src/workflow.ts', source);
	}

	it('fails the build at the place of each wrong expression, Code typo, and fixed value', async () => {
		const source = `import { workflow, manual, node } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Wrong expressions',
	manual({ sample: ${SAMPLE} }),
	gmail.message.get({ name: 'Get', messageId: '={{ $json.idd }}' }),
	gmail.message.getAll({
				name: 'List',
				filters: {
					q: '=after:{{ $now.toISO() }} {{ $now.toISo() }}',
					receivedAfter: '={{ $pageCount }}',
					sender: '={{ $("Strat").item.json.subject }}',
				},
				paging: { mode: 'limit', max: '={{ $json.Subject }}' },
			}),
	node({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				version: 2,
				parameters: {
					jsCode: "const all = $('Start').all();\\nreturn all.map((i) => ({ json: { s: i.json.subjcet } }));",
				},
			}),
	gmail.message.getAll({ name: 'Too few', paging: { mode: 'limit', max: 0 } }),
);
`;
		const result = await build(source);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.reason).toBe('workflow_source_type_errors');
		expect(result.errors).toEqual([
			`${at(source, '$json.idd', 6)}: error TS2339: Property 'idd' does not exist on type '{ id: string; subject: string; count: number; }'.`,
			`${at(source, '$now.toISo', 5)}: error TS2551: Property 'toISo' does not exist on type 'DateTime'. Did you mean 'toISO'?`,
			`${at(source, '$pageCount')}: error TS2304: Cannot find name '$pageCount'.`,
			`${at(source, '"Strat"')}: error TS2345: Argument of type '"Strat"' is not assignable to parameter of type '"Get" | "Start"'.`,
			`${at(source, "'={{ $json.Subject }}'")}: error TS2322: The expression result does not fit the field: Type 'string' is not assignable to type 'number'.`,
			`${at(source, 'subjcet')}: error TS2551: Property 'subjcet' does not exist on type '{ id: string; subject: string; count: number; }'. Did you mean 'subject'?`,
			'Node "Too few": input.paging.max: must be at least 1',
		]);
	}, 120_000);

	it('checks each expr() call in place, with or without its "="', async () => {
		const source = `import { workflow, manual, set, expr } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Expr calls',
	manual({ sample: ${SAMPLE} }),
	set({ name: 'Fields', fields: { text: expr('Hi {{ $json.subjet }}') }, keep: 'all' }),
	gmail.message.get({ name: 'Get', messageId: expr('={{ $json.idd }}') }),
	gmail.message.getAll({
				name: 'List',
				paging: { mode: 'limit', max: expr("{{ $('Start').item.json.subject }}") },
			}),
);
`;
		const result = await build(source);
		expect(result.success ? [] : result.errors).toEqual([
			`${at(source, 'subjet')}: error TS2551: Property 'subjet' does not exist on type '{ id: string; subject: string; count: number; }'. Did you mean 'subject'?`,
			`${at(source, '$json.idd', 6)}: error TS2339: Property 'idd' does not exist on type '{ id: string; subject: string; count: number; text: string; }'.`,
			`${at(source, "expr(\"{{ $('Start')")}: error TS2322: The expression result does not fit the field: Type 'string' is not assignable to type 'number'.`,
		]);
	}, 120_000);

	it('types a flat list of 12 parts with when, route, and onError, and names a typo in one line', async () => {
		const source = (seventh: string) => `import { workflow, manual, set, when, route, onError, steps } from '@n8n/workflow-sdk/next';
import { dataTable } from '@n8n/nodes/dataTable';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Twelve parts',
	manual({ sample: ${SAMPLE} }),
	gmail.message.get({ name: 'Get', messageId: (item) => item.id }),
	onError(set({ name: 'Log', fields: { reason: (e) => e.error } })),
	set({ name: 'Subject', fields: { subject: (_item, $) => $('Start').subject } }),
	when({ name: 'Has subject?', if: (item) => item.subject !== '' }, {
		then: steps(
			set({ name: 'Upper', fields: { subject: (item) => item.subject.toUpperCase() } }),
			set({ name: 'Trim', fields: { subject: (item) => item.subject.trim() } }),
		),
		else: set({ name: 'Empty', fields: { subject: 'none' } }),
	}),
	route(dataTable.row.exists({ name: 'Known', table: { name: 'subjects' }, where: { match: 'all', conditions: [{ column: 'subject', op: 'eq', value: (item) => item.subject }] } }), {
		exists: set({ name: 'Old', fields: { subject: (item) => item.subject } }),
		missing: set({ name: 'New', fields: { subject: (item, $) => \`\${item.subject} \${$('Get').id}\` } }),
	}),
	set({ name: 'Count', fields: { length: (item) => item.subject.length } }),
	set({ name: 'Twice', fields: { twice: (item) => ${seventh} * 2 } }),
	set({ name: 'Back', fields: { back: (item, $) => item.twice + $('Count').length } }),
	set({ name: 'Flag', fields: { long: (item) => item.back > 10 } }),
	set({ name: 'Text', fields: { text: (item) => (item.long ? 'long' : 'short') } }),
	set({ name: 'Done', fields: { done: (item, $) => \`\${item.text} \${$('Start').count}\` } }),
	set({ name: 'Last', fields: { last: (item) => item.done.length } }),
);
`;
		const right = await build(source('item.length'));
		expect(right.success ? [] : right.errors).toEqual([]);
		const typo = source('item.lenght');
		const wrong = await build(typo);
		expect(wrong.success ? [] : wrong.errors).toEqual([
			`${at(typo, 'lenght')}: error TS2551: Property 'lenght' does not exist on type '{ length: number; }'. Did you mean 'length'?`,
		]);
	}, 120_000);

	it('fails the build at each typo in a code.javaScript step', async () => {
		const source = `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { code } from '@n8n/nodes/code';

export default workflow(
	'Code step typo',
	manual({ sample: [{ subject: 'Hi' }] }),
	code.javaScript({
			name: 'Code',
			code: 'return $input.all().map((i) => ({ s: i.json.subjcet, t: undefinedName }));',
		}),
);
`;
		const result = await build(source);
		expect(result.success ? [] : result.errors).toEqual([
			`${at(source, 'subjcet')}: error TS2551: Property 'subjcet' does not exist on type '{ subject: string; }'. Did you mean 'subject'?`,
			`${at(source, 'undefinedName')}: error TS2552: Cannot find name 'undefinedName'. Did you mean 'undefined'?`,
		]);
	}, 120_000);

	async function buildWithout(path: string, source: string) {
		await rename(join(root, path), join(root, `${path}.off`));
		try {
			return await build(source);
		} finally {
			await rename(join(root, `${path}.off`), join(root, path));
		}
	}

	it('fails the build when the type check cannot run', async () => {
		const result = await buildWithout(
			WORKFLOW_DIAGNOSTICS_FILENAME,
			`import { workflow, manual } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'No type check',
	manual({ sample: [{ id: 'x', count: 3 }] }),
	gmail.message.get({ name: 'Get', messageId: (item) => item.count }),
);
`,
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.reason).toBe('workflow_source_sandbox_failed');
		expect(result.editable).toBe(true);
		expect(result.errors.at(-1)).toMatch(
			/^The type check did not complete \(exit code 1\)\. Call build-workflow again with the same filePath\.\n/,
		);
	}, 120_000);

	it('fails the build when the expression check cannot run', async () => {
		const result = await buildWithout(
			'node_modules/@n8n/expression-types',
			`import { workflow, manual } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'No expression check',
	manual({ sample: [{ id: 'x', count: 3 }] }),
	gmail.message.getAll({ name: 'List', paging: { mode: 'limit', max: '={{ $json.id }}' } }),
);
`,
		);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.reason).toBe('workflow_source_sandbox_failed');
		expect(result.errors.at(-1)).toMatch(
			/^The type check did not complete \(exit code 3\)\. Call build-workflow again with the same filePath\.\nExpression check failed: /,
		);
	}, 120_000);

	it('types the full message of simplify: false, so the sender is from.value[0].address', async () => {
		const source = `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Full message',
	manual({ sample: ${SAMPLE} }),
	gmail.message.get({ name: 'Get', messageId: '={{ $json.id }}', simplify: false }),
	gmail.message.send({
				name: 'Reply',
				to: '={{ $json.from.value[0].address }}',
				subject: '={{ $json.subject ?? "" }}',
				body: { format: 'text', text: '={{ $json.text ?? $json.headers.subject }}' },
			}),
	gmail.message.send({
				name: 'Wrong',
				to: "={{ $('Get').item.json.From }}",
				subject: 'x',
				body: { format: 'text', text: 'x' },
			}),
);
`;
		const result = await build(source);
		const errors = result.success ? [] : result.errors;
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain(
			`${at(source, 'From }}')}: error TS2551: Property 'From' does not exist`,
		);
		expect(errors[0]).toContain("Did you mean 'from'?");
	}, 120_000);

	it('builds when every expression and the Code node fit', async () => {
		const source = `import { workflow, manual, node, set, expr } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Right expressions',
	manual({ sample: ${SAMPLE} }),
	set({ name: 'Mixed', fields: { text: expr('Hi {{ $json.subject }}') }, keep: 'all' }),
	gmail.message.get({ name: 'Get', messageId: '={{ $json.id }}' }),
	gmail.message.getAll({
				name: 'List',
				filters: {
					q: '=subject:{{ $("Start").item.json.subject.toLowerCase() }}',
					receivedAfter: '={{ $now.minus({ days: 7 }).toISO() }}',
				},
				paging: { mode: 'limit', max: '={{ $("Start").item.json.count }}' },
			}),
	node({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				version: 2,
				parameters: {
					jsCode: "const out = {};\\nout.total = $input.all().length;\\nreturn $('Start').all().map((i) => ({ json: { s: i.json.subject, n: out.total } }));",
				},
			}),
);
`;
		const result = await build(source);
		expect(result.success ? [] : result.errors).toEqual([]);
	}, 120_000);

	it('builds a decompiled saved workflow unchanged, with its node settings', async () => {
		const seed: WorkflowJSON = JSON.parse(
			await readFile(
				join(
					__dirname,
					'../../../../evaluations/node-contracts/seeds/nc-notion-edit-add-filter.off.json',
				),
				'utf8',
			),
		);
		const withRetry = {
			...seed,
			nodes: seed.nodes.map((node) =>
				node.type === 'n8n-nodes-base.httpRequest'
					? { ...node, retryOnFail: true, maxTries: 3, onError: 'continueRegularOutput' as const }
					: node,
			),
		};
		for (const json of [seed, withRetry]) {
			const { code } = await getAsCode(context, json);
			expect(code).toContain("from '@n8n/workflow-sdk/next';");
			// The Set node's expression has a callback over a Loose item: `.filter(o => …)`.
			expect(code).toContain('.filter(o => ');
			const result = await build(code);
			expect(result.success ? [] : result.errors).toEqual([]);
			if (!result.success) return;
			const post = result.workflow.nodes.find((node) => node.name === 'POST Done Report');
			expect(post?.retryOnFail).toBe(json === withRetry ? true : undefined);
			expect(post?.onError).toBe(json === withRetry ? 'continueRegularOutput' : undefined);
		}
	}, 120_000);

	it('builds a decompiled contract node with its credential selector and an edited JSON field', async () => {
		const saved: WorkflowJSON = {
			id: 'wf-edited',
			name: 'Edited in the editor',
			nodes: [
				{
					id: 'n1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'n2',
					name: 'Post',
					type: '@n8n/nodes-base-next.httpRequestSend',
					typeVersion: 3,
					position: [224, 0],
					parameters: {
						method: 'POST',
						url: 'https://reports.example.com/api/done',
						body: { kind: 'json', json: '{"done":true}' },
						authentication: 'httpBearerAuth',
					},
				},
			],
			connections: { Start: { main: [[{ node: 'Post', type: 'main', index: 0 }]] } },
		};
		const { code } = await getAsCode(context, saved);
		expect(code).toContain('authentication: "httpBearerAuth"');
		const result = await build(code);
		expect(result.success ? [] : result.errors).toEqual([]);
		if (!result.success) return;
		expect(result.workflow.nodes.find((node) => node.name === 'Post')?.parameters).toEqual({
			method: 'POST',
			url: 'https://reports.example.com/api/done',
			body: { kind: 'json', json: { done: true } },
			authentication: 'httpBearerAuth',
		});
	}, 120_000);

	it('builds the legacy SDK source of a saved loop workflow unchanged, with its node settings', async () => {
		const seed: WorkflowJSON = JSON.parse(
			await readFile(join(__dirname, 'order-sync-loop.workflow.json'), 'utf8'),
		);
		const legacy = await getAsCode({ ...context, nodeContractsEnabled: false }, seed);
		const fallback = await getAsCode(context, seed);
		expect(legacy.code).toContain("from '@n8n/workflow-sdk';");

		for (const { code } of [legacy, fallback]) {
			const result = await build(code);
			expect(result.success ? [] : result.errors).toEqual([]);
			if (!result.success) return;
			const lookUp = result.workflow.nodes.find((node) => node.name === 'Look Up Order');
			expect(lookUp?.alwaysOutputData).toBe(true);
			expect(result.workflow.connections).toEqual(seed.connections);
		}
	}, 120_000);

	it('builds the lambda of a binary field as the key of a binary of the input item', async () => {
		const result = await build(`import { workflow, manual } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Forward a file',
	manual({ sample: [{ id: 'x' }] }),
	httpRequest.download({ name: 'Download', url: 'https://files.example.com/a.pdf' }),
	httpRequest.send({
				name: 'Upload',
				method: 'POST',
				url: 'https://archive.example.com/api/upload',
				body: { kind: 'binary', file: (item) => item.binary.data },
			}),
);
`);
		expect(result.success ? [] : result.errors).toEqual([]);
		if (!result.success) return;
		const upload = result.workflow.nodes.find((node) => node.name === 'Upload');
		expect(upload?.parameters?.body).toEqual({ kind: 'binary', file: 'data' });
	}, 120_000);

	it('types the Gmail attachments as binary keys with the prefix', async () => {
		const source = (key: string) => `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Forward files',
	manual({ sample: [{ id: 'm1' }] }),
	gmail.message.get({ name: 'Get', messageId: '={{ $json.id }}', simplify: false, downloadAttachments: true }),
	gmail.message.send({
				name: 'Forward',
				to: 'archive@example.com',
				subject: 'Files',
				body: { format: 'text', text: 'Files' },
				attachments: [(item) => item.binary.${key}],
			}),
);
`;
		const result = await build(source('attachment_0'));
		expect(result.success ? [] : result.errors).toEqual([]);
		if (!result.success) return;
		const forward = result.workflow.nodes.find((node) => node.name === 'Forward');
		expect(forward?.parameters?.attachments).toEqual(['attachment_0']);
		const wrong = await build(source('file_0'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Property 'file_0' does not exist"),
		]);
	}, 120_000);

	it('types a multipart webhook file by its field name, and the status code of a full response', async () => {
		const source = (full: boolean) => `import { workflow, set } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';
import { webhook } from '@n8n/nodes/webhook';

export default workflow(
	'Upload a photo',
	webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'photos' }),
	httpRequest.send({
				name: 'Store',
				method: 'POST',
				url: 'https://archive.example.com/api/upload',
				body: { kind: 'binary', file: (item) => item.binary.image },
				fullResponse: ${full},
				neverError: true,
			}),
	set({ name: 'Outcome', fields: { next: (item) => item.statusCode + 1 } }),
);
`;
		const result = await build(source(true));
		expect(result.success ? [] : result.errors).toEqual([]);
		if (!result.success) return;
		const store = result.workflow.nodes.find((node) => node.name === 'Store');
		expect(store?.parameters?.body).toEqual({ kind: 'binary', file: 'image' });
		const bodyOnly = await build(source(false));
		expect(bodyOnly.success ? [] : bodyOnly.errors).toEqual([
			expect.stringContaining("'item.statusCode' is of type 'unknown'"),
		]);
	}, 120_000);

	it('lets the lambda of an optional contract field give undefined, but not another type', async () => {
		const source = (fileName: string) => `import { workflow, placeholder } from '@n8n/workflow-sdk/next';
import { slack } from '@n8n/nodes/slack';
import { webhook } from '@n8n/nodes/webhook';

export default workflow(
	'Upload to Slack',
	webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'images' }),
	slack.file.upload({
		name: 'Upload',
		file: (item) => item.binary.image,
		channel: placeholder('Slack channel ID'),
		fileName: ${fileName},
	}),
);
`;
		const result = await build(source('(item) => item.binary.image.fileName'));
		expect(result.success ? [] : result.errors).toEqual([]);
		const wrongType = await build(source('(item) => item.binary.image.bytes'));
		expect(wrongType.success ? [] : wrongType.errors).toEqual([
			expect.stringContaining("Type 'number' is not assignable to type 'string'"),
		]);
	}, 120_000);

	it('splits out a list at a dot path of an open webhook body', async () => {
		const result = await build(`import { workflow, splitOut, set } from '@n8n/workflow-sdk/next';
import { webhook } from '@n8n/nodes/webhook';

export default workflow(
	'Orders',
	webhook.trigger({ name: 'Webhook', httpMethod: 'POST', path: 'orders' }),
	splitOut({ name: 'Split Orders', field: 'body.orders' }),
	set({ name: 'Order', fields: { id: (order) => String(order.id) } }),
);
`);
		expect(result.success ? [] : result.errors).toEqual([]);
		if (!result.success) return;
		const split = result.workflow.nodes.find((node) => node.name === 'Split Orders');
		expect(split?.parameters).toEqual({ field: 'body.orders' });
	}, 120_000);

	it('types an open output by its sample, also after recover', async () => {
		const source = (field: string) => `import { workflow, manual, set, recover, expr } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Enrich',
	manual({ sample: [{ domain: 'acme.com' }] }),
	httpRequest.get({ name: 'Company', url: 'https://api.example.com/company', sample: [{ metrics: { employees: 120 } }] }),
	recover(set({ name: 'Failed', fields: { enrichmentFailed: true } })),
	set({ name: 'Size', fields: {
		employees: (item) => ('metrics' in item ? item.metrics.${field} : 0),
		fromCompany: expr("{{ $('Company').item.json.metrics.employees + 1 }}"),
	} }),
);
`;
		const right = await build(source('employees'));
		expect(right.success ? [] : right.errors).toEqual([]);
		const wrong = await build(source('revenue'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Property 'revenue' does not exist on type '{ employees: number; }'"),
		]);
	}, 120_000);

	it('types the body of a full response by its sample', async () => {
		const source = (field: string) => `import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Full response',
	manual(),
	httpRequest.get({
		name: 'Fetch',
		url: 'https://api.example.com/x',
		fullResponse: true,
		sample: [{ body: { items: [{ id: 1 }] }, headers: {}, statusCode: 200 }],
	}),
	set({ name: 'First', fields: { first: (item) => item.body.${field}[0].id + item.statusCode } }),
);
`;
		const right = await build(source('items'));
		expect(right.success ? [] : right.errors).toEqual([]);
		const wrong = await build(source('next'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Property 'next' does not exist"),
		]);
	}, 120_000);

	it('types a full response by a sample that leaves fields out, never wider', async () => {
		const source = (sample: string) => `import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Partial sample',
	manual(),
	httpRequest.get({
		name: 'Fetch',
		url: 'https://api.example.com/x',
		fullResponse: true,
		neverError: true,
		sample: [${sample}],
	}),
	set({ name: 'Size', fields: {
		employees: (item) => (item.statusCode === 200 ? item.body.metrics.employees : 0),
		type: (item) => item.headers['content-type'] ?? '',
	} }),
);
`;
		const right = await build(source('{ statusCode: 200, body: { metrics: { employees: 50 } } }'));
		expect(pathWarnings(right)).toEqual([]);
		expect(right.success && right.declaredOutputFixtures?.Fetch).toEqual([
			{ statusCode: 200, body: { metrics: { employees: 50 } }, headers: expect.any(Object) },
		]);
		const wrong = await build(source("{ statusCode: '200' }"));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Type 'string' is not assignable to type 'number'"),
		]);
	}, 120_000);

	it('pins the same nodes with and without step samples, and fills a partial service sample', async () => {
		const source = (samples: boolean) => `import { workflow, manual, node } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';
import { items } from '@n8n/nodes/items';

export default workflow(
	'Mixed',
	manual({ sample: [{ id: 'o1' }] }),
	httpRequest.get({
		name: 'Fetch',
		url: 'https://api.example.com/x',
		fullResponse: true,
		${samples ? "sample: [{ statusCode: 200, body: { lines: [{ sku: 'a' }] } }]," : ''}
	}),
	items.splitOut({ name: 'Lines', field: 'body.lines'${samples ? ", sample: [{ sku: 'a' }]" : ''} }),
	node({ name: 'Pass', type: 'n8n-nodes-base.noOp', version: 1${samples ? ", sample: [{ sku: 'b' }]" : ''} }),
);
`;
		const plain = await build(source(false));
		const sampled = await build(source(true));
		if (!plain.success || !sampled.success) {
			expect([plain, sampled].flatMap((result) => (result.success ? [] : result.errors))).toEqual(
				[],
			);
			return;
		}
		const pinned = (result: typeof sampled) =>
			Object.keys(result.declaredOutputFixtures ?? {}).sort();
		expect(pinned(plain)).toEqual(['Fetch', 'Start']);
		expect(pinned(sampled)).toEqual(pinned(plain));
		expect(sampled.declaredOutputFixtures).toEqual({
			Start: [{ id: 'o1' }],
			Fetch: [{ statusCode: 200, body: { lines: [{ sku: 'a' }] }, headers: expect.any(Object) }],
		});
		expect(sampled.fixtureOrigins).toEqual({ Start: 'sample', Fetch: 'synthesized' });
		expect(sampled.sampledKeys).toEqual({ Fetch: ['statusCode', 'body'] });
	}, 180_000);

	it('fails a read of a field that the step before does not output, on each surface', async () => {
		const source = (read: string) => `import { workflow, manual, set, node, expr } from '@n8n/workflow-sdk/next';
import { code } from '@n8n/nodes/code';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Surfaces',
	manual(),
	httpRequest.get({
		name: 'Fetch',
		url: 'https://api.example.com/x',
		fullResponse: true,
		sample: [{ statusCode: 200, body: { id: 1 } }],
	}),
	${read},
);
`;
		const reads = [
			"set({ name: 'Read', fields: { a: (item) => item.total } })",
			"set({ name: 'Read', fields: { a: expr('{{ $json.total }}') } })",
			"set({ name: 'Read', fields: { a: '={{ $json.total }}' } })",
			"set({ name: 'Read', fields: { a: '=Total: {{ $json.total }}' } })",
			"httpRequest.get({ name: 'Read', url: '={{ $json.total }}' })",
			"node({ name: 'Read', type: 'n8n-nodes-base.noOp', version: 1, parameters: { note: '={{ $json.total }}' } })",
			"node({ name: 'Read', type: 'n8n-nodes-base.noOp', version: 1, parameters: { note: '={{ $(\"Fetch\").item.json.total }}' } })",
			"code.javaScript({ name: 'Read', code: 'return $input.all().map((i) => ({ json: { a: i.json.total } }));' })",
		];
		for (const read of reads) {
			const result = await build(source(read));
			expect(result.success ? [] : result.errors, read).toEqual([
				expect.stringContaining("Property 'total' does not exist"),
			]);
		}
		const raw = source(
			"set({ name: 'Read', fields: { a: '={{ $json.body.id + 1 }}', b: '={{ $json.body.idd }}' } })",
		);
		const located = await build(raw);
		expect(located.success ? [] : located.errors).toEqual([
			`${at(raw, 'idd')}: error TS2339: Property 'idd' does not exist on type '{ id: number; }'.`,
		]);
	}, 120_000);

	it('types the next steps by the declared body schema of httpRequest.get, on each surface', async () => {
		const source = (declared: string, read: string) => `import { workflow, manual, set, expr } from '@n8n/workflow-sdk/next';
import { code } from '@n8n/nodes/code';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Declared body',
	manual(),
	httpRequest.get({
		name: 'Fetch',
		url: 'https://api.example.com/issues',
		${declared},
	}),
	${read},
);
`;
		const schema =
			"schema: { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } } }, required: ['issues'] }";
		const reads = [
			"set({ name: 'Read', fields: { a: (item) => item.users } })",
			"set({ name: 'Read', fields: { a: expr('{{ $json.users }}') } })",
			"set({ name: 'Read', fields: { a: '={{ $json.users }}' } })",
			"httpRequest.get({ name: 'Read', url: '={{ $json.users }}' })",
			"set({ name: 'Read', fields: { a: (_item, $) => $('Fetch').users } })",
			"code.javaScript({ name: 'Read', code: 'return $input.all().map((i) => ({ a: i.json.users }));' })",
		];
		for (const read of reads) {
			const declared = await build(source(schema, read));
			expect(declared.success ? [] : declared.errors, read).toEqual([
				expect.stringContaining(
					"Property 'users' does not exist on type '{ issues: { title: string; }[]; }'",
				),
			]);
		}
		const nested = await build(
			source(
				schema,
				"code.javaScript({ name: 'Read', code: 'return $input.first().json.issues.map((issue) => ({ t: issue.titel }));' })",
			),
		);
		expect(nested.success ? [] : nested.errors).toEqual([
			expect.stringContaining("Property 'titel' does not exist on type '{ title: string; }'"),
		]);
		const right = await build(
			source(
				schema,
				"set({ name: 'Read', fields: { titles: (item) => item.issues.map((issue) => issue.title).join(', ') } })",
			),
		);
		expect(pathWarnings(right)).toEqual([]);
		expect(sampledReads(right)).toEqual([]);
		// A sample types the fields it gives; the other keys of an open body still read as `any`.
		const sampled = await build(
			source("sample: [{ issues: [{ title: 'Login 500' }] }]", reads[0] ?? ''),
		);
		expect(pathWarnings(sampled)).toEqual([]);
		expect(sampledReads(sampled)).toEqual(['Fetch']);
	}, 120_000);

	it('types a declared nullable body field of a full response, so a read must check it', async () => {
		const source = (read: string) => `import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Nullable body field',
	manual(),
	httpRequest.get({
		name: 'Apollo',
		url: 'https://api.apollo.io/v1/organizations/enrich',
		fullResponse: true,
		neverError: true,
		schema: {
			type: 'object',
			properties: {
				organization: {
					anyOf: [
						{ type: 'object', properties: { estimated_num_employees: { type: 'number' } } },
						{ type: 'null' },
					],
				},
			},
			required: ['organization'],
		},
	}),
	set({ name: 'Employees', fields: { employees: (res) => ${read} } }),
);
`;
		const wrong = await build(source('res.body.organization.estimated_num_employees'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("'res.body.organization' is possibly 'null'"),
		]);
		const right = await build(source('res.body.organization?.estimated_num_employees ?? null'));
		expect(pathWarnings(right)).toEqual([]);
	}, 120_000);

	it('types the items of a step that continues on error as its output or { error }', async () => {
		const source = (status: string) => `import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { code } from '@n8n/nodes/code';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Post orders',
	manual({ sample: [{ id: 'o1' }] }),
	httpRequest.send({
		name: 'Post',
		method: 'POST',
		url: 'https://api.example.com/orders',
		body: { kind: 'json', json: (item) => ({ id: item.id }) },
		fullResponse: true,
		sample: [{ statusCode: 201, body: { id: 'o1' } }],
		settings: { onError: 'continueRegularOutput' },
	}),
	set({ name: 'Outcome', fields: { failed: (item) => item.error ?? '', created: (item) => item.statusCode === 201, status: (item) => ${status} } }),
	code.javaScript({
		name: 'Dead letters',
		code: "return $('Post').all().filter((i) => i.json.error !== undefined).map((i) => ({ json: { reason: i.json.error } }));",
	}),
);
`;
		const right = await build(source('(item.error === undefined ? item.statusCode : 0)'));
		expect(pathWarnings(right)).toEqual([]);
		if (right.success) {
			expect(right.workflow.nodes.find((node) => node.name === 'Post')?.onError).toBe(
				'continueRegularOutput',
			);
		}
		const wrong = await build(source('item.statusCode.toFixed()'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("'item.statusCode' is possibly 'undefined'"),
		]);
	}, 120_000);

	it('builds the error branch of a sampled step that reads the error text', async () => {
		const source = (reason: string) => `import { workflow, manual, set, onError } from '@n8n/workflow-sdk/next';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
	'Errors',
	manual(),
	httpRequest.get({ name: 'Fetch', url: 'https://api.example.com/x', sample: [{ id: 1 }] }),
	onError(set({ name: 'Log', fields: { reason: (e) => ${reason} } })),
);
`;
		const right = await build(source('e.error'));
		expect(pathWarnings(right)).toEqual([]);
		const wrong = await build(source('e.error.message'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Property 'message' does not exist on type 'string'"),
		]);
	}, 120_000);

	it('types set fields at dotted paths with kept paths, and the lambdas of items.set fields', async () => {
		const source = (field: string) => `import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { items } from '@n8n/nodes/items';

export default workflow(
	'Fields',
	manual({ sample: [{ id: 'u1', password: 'x', profile: { email: 'a@b.c', city: 'Berlin' } }] }),
	set({ name: 'Contact', fields: { 'contact.city': (user) => user.profile.city }, keep: { selected: ['id'] } }),
	items.set({ name: 'Legacy', fields: { label: (item) => item.id + item.contact.${field} } }),
);
`;
		const right = await build(source('city'));
		expect(right.success ? [] : right.errors).toEqual([]);
		if (right.success) {
			expect(right.workflow.nodes.find((node) => node.name === 'Contact')?.parameters).toEqual({
				fields: { 'contact.city': '={{ $json.profile.city }}' },
				include: { mode: 'selected', fields: ['id'] },
			});
		}
		const wrong = await build(source('town'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Property 'town' does not exist on type '{ city: string; }'"),
		]);
	}, 120_000);

	it('builds a merge of three branches in a forEach body and a loop that ends at its limit', async () => {
		const result = await build(`import { workflow, manual, set, merge, forEach, loop } from '@n8n/workflow-sdk/next';

export default workflow(
	'Regions',
	manual({ sample: [{ id: 'w1', nodes: 3, level: 0 }] }),
	forEach({ name: 'Each workflow', batchSize: 1 }, merge({ name: 'Parts', join: 'position' }, [
		set({ name: 'Nodes', fields: { nodes: (w) => w.nodes } }),
		set({ name: 'Id', fields: { id: (w) => w.id } }),
		set({ name: 'Level', fields: { level: (w) => w.level } }),
	])),
	loop({ name: 'Walk', maxIterations: 10, onLimit: 'continue', until: (out) => out.level >= 3 },
		set({ name: 'Up', fields: { level: (s) => s.level + 1 }, keep: 'all' }),
	),
	set({ name: 'Depth', fields: { depth: (out) => out.level, id: (out) => out.id } }),
);
`);
		expect(result.success ? [] : result.errors).toEqual([]);
		if (!result.success) return;
		const parts = result.workflow.nodes.find((node) => node.name === 'Parts');
		expect(parts).toMatchObject({
			type: '@n8n/nodes-base-next.mergeCombineByPosition',
			parameters: { inputs: 3 },
		});
		expect(result.workflow.nodes.map((node) => node.name)).toContain('Each workflow start');
		expect(result.workflow.nodes.map((node) => node.name)).not.toContain('Walk limit');
	}, 120_000);

	it('types the output of items.aggregate from its input items', async () => {
		const repro = await build(`import { workflow, set, merge, forEach, steps } from '@n8n/workflow-sdk/next';
import { webhook } from '@n8n/nodes/webhook';
import { items } from '@n8n/nodes/items';
import { httpRequest } from '@n8n/nodes/httpRequest';

export default workflow(
  'Process workflow definitions and sign',
  webhook.trigger({
    name: 'Receive Workflows',
    httpMethod: 'POST',
    path: 'workflow-definitions',
    responseMode: 'lastNode',
    sample: [
      {
        body: {
          workflows: [
            {
              id: 'wf_1',
              name: 'Demo A',
              active: true,
              nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }],
              connections: { Start: {} },
              settings: { timezone: 'UTC' },
            },
            {
              id: 'wf_2',
              name: 'Demo B',
              active: false,
              nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
              connections: { Webhook: {} },
              settings: { timezone: 'UTC' },
            },
          ],
        },
      },
    ],
  }),

  items.splitOut({
    name: 'Split Workflows',
    field: 'body.workflows',
    into: 'workflow',
    sample: [
      {
        workflow: {
          id: 'wf_1',
          name: 'Demo A',
          active: true,
          nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }],
          connections: { Start: {} },
          settings: { timezone: 'UTC' },
        },
      },
    ],
  }),

  // One workflow definition at a time; inside, the three pieces are extracted in parallel.
  forEach(
    { name: 'Each Workflow', batchSize: 1 },
    steps(
      merge({ name: 'Combine Pieces', join: 'position' }, [
        set({
          name: 'Extract Nodes',
          fields: {
            workflowId: (i) => i.workflow.id,
            nodes: (i) => i.workflow.nodes,
            nodeCount: (i) => (i.workflow.nodes ?? []).length,
          },
        }),
        set({
          name: 'Extract Connections',
          fields: {
            connections: (i) => i.workflow.connections,
            connectionSourceCount: (i) => Object.keys(i.workflow.connections ?? {}).length,
          },
        }),
        set({
          name: 'Extract Metadata',
          fields: {
            'metadata.id': (i) => i.workflow.id,
            'metadata.name': (i) => i.workflow.name,
            'metadata.active': (i) => i.workflow.active,
            'metadata.settings': (i) => i.workflow.settings,
          },
        }),
      ]),
      set({
        name: 'Assemble Workflow',
        fields: {
          workflowId: (i) => i.workflowId,
          metadata: (i) => i.metadata,
          nodes: (i) => i.nodes,
          connections: (i) => i.connections,
          nodeCount: (i) => i.nodeCount,
          connectionSourceCount: (i) => i.connectionSourceCount,
        },
      }),
    ),
  ),

  // All workflows processed: fold them into one payload.
  items.aggregate({
    name: 'Collect All',
    aggregate: { mode: 'items', into: 'workflows' },
  }),

  set({
    name: 'Build Payload',
    fields: {
      signedAt: (_i, $) => $.now.toISO(),
      workflowCount: (i) => (i.workflows ?? []).length,
      workflows: (i) => i.workflows,
    },
  }),

  httpRequest.send({
    name: 'Sign Payload',
    method: 'POST',
    url: 'https://api.example.com/sign',
    body: {
      kind: 'json',
      json: (i) => ({
        signedAt: i.signedAt,
        workflowCount: i.workflowCount,
        workflows: i.workflows,
      }),
    },
  }),
);
`);
		expect(repro.success ? [] : repro.errors).toEqual([]);
		const fields = (read: string) => `import { workflow, manual, set } from '@n8n/workflow-sdk/next';
import { items } from '@n8n/nodes/items';

export default workflow(
	'Fields',
	manual({ sample: [{ id: 'w1', meta: { name: 'A', tags: ['x'] }, score: 3 }] }),
	items.aggregate({
		name: 'Collect',
		aggregate: {
			mode: 'fields',
			fields: [{ field: 'id' }, { field: 'meta.name', as: 'names' }, { field: 'meta.tags' }],
			mergeLists: true,
		},
	}),
	set({ name: 'Read', fields: { value: (i) => ${read} } }),
);
`;
		const right = await build(fields("i.id.length + i.names[0].length + i.tags.join(',').length"));
		expect(right.success ? [] : right.errors).toEqual([]);
		const wrong = await build(fields('i.score'));
		expect(wrong.success ? [] : wrong.errors).toEqual([
			expect.stringContaining("Property 'score' does not exist"),
		]);
	}, 180_000);

	it('reports a node() without a top-level name as a build error, not a crash', async () => {
		const result = await build(`import { workflow, manual, node } from '@n8n/workflow-sdk/next';

export default workflow(
	'Legacy shape',
	manual(),
	node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'Pass', parameters: {} } }),
);
`);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors).toEqual(
			expect.arrayContaining([
				expect.stringContaining('A node of type "n8n-nodes-base.noOp" has no name'),
				expect.stringContaining("'config' does not exist"),
			]),
		);
	}, 120_000);

	it('fails the build of a source that imports both SDKs', async () => {
		const result = await build(`import { workflow, trigger } from '@n8n/workflow-sdk';
import { manual } from '@n8n/workflow-sdk/next';

export default workflow('Both', 'Both');
`);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.reason).toBe('workflow_source_build_failed');
		expect(result.errors).toEqual([
			"Import from '@n8n/workflow-sdk/next' or from '@n8n/workflow-sdk', not from both.",
		]);
	});
});

async function getAsCode(context: InstanceAiContext, json: WorkflowJSON) {
	const tool = createWorkflowsTool({
		...context,
		workspace: undefined,
		workflowService: {
			get: async () => await Promise.resolve({ versionId: 'v1', checksum: 'c1' }),
			getAsWorkflowJSON: async () => await Promise.resolve(json),
		},
	} as unknown as InstanceAiContext);
	return await executeTool<{ code: string }>(tool, {
		action: 'get-as-code',
		workflowId: json.id ?? '',
	});
}
