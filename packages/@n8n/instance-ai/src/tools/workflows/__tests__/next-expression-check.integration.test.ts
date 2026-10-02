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
	manual({ sample: ${SAMPLE} })
		.andThen(gmail.message.get({ name: 'Get', messageId: '={{ $json.idd }}' }))
		.andThen(
			gmail.message.getAll({
				name: 'List',
				filters: {
					q: '=after:{{ $now.toISO() }} {{ $now.toISo() }}',
					receivedAfter: '={{ $pageCount }}',
					sender: '={{ $("Strat").item.json.subject }}',
				},
				paging: { mode: 'limit', max: '={{ $json.Subject }}' },
			}),
		)
		.andThen(
			node({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				version: 2,
				parameters: {
					jsCode: "const all = $('Start').all();\\nreturn all.map((i) => ({ json: { s: i.json.subjcet } }));",
				},
			}),
		)
		.andThen(gmail.message.getAll({ name: 'Too few', paging: { mode: 'limit', max: 0 } })),
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

	it('fails the build at each typo in a code.javaScript step', async () => {
		const source = `import { workflow, manual } from '@n8n/workflow-sdk/next';
import { code } from '@n8n/nodes/code';

export default workflow(
	'Code step typo',
	manual({ sample: [{ subject: 'Hi' }] }).andThen(
		code.javaScript({
			name: 'Code',
			code: 'return $input.all().map((i) => ({ s: i.json.subjcet, t: undefinedName }));',
		}),
	),
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
	manual({ sample: [{ id: 'x', count: 3 }] }).andThen(
		gmail.message.get({ name: 'Get', messageId: (item) => item.count }),
	),
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
	manual({ sample: [{ id: 'x', count: 3 }] }).andThen(
		gmail.message.getAll({ name: 'List', paging: { mode: 'limit', max: '={{ $json.id }}' } }),
	),
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

	it('builds when every expression and the Code node fit', async () => {
		const source = `import { workflow, manual, node, set } from '@n8n/workflow-sdk/next';
import { gmail } from '@n8n/nodes/gmail';

export default workflow(
	'Right expressions',
	manual({ sample: ${SAMPLE} })
		.andThen(set({ name: 'Quoted', fields: { text: '={{ $json.nope.deeper }}' }, keep: 'all' }))
		.andThen(gmail.message.get({ name: 'Get', messageId: '={{ $json.id }}' }))
		.andThen(
			gmail.message.getAll({
				name: 'List',
				filters: {
					q: '=subject:{{ $("Start").item.json.subject.toLowerCase() }}',
					receivedAfter: '={{ $now.minus({ days: 7 }).toISO() }}',
				},
				paging: { mode: 'limit', max: '={{ $("Start").item.json.count }}' },
			}),
		)
		.andThen(
			node({
				name: 'Code',
				type: 'n8n-nodes-base.code',
				version: 2,
				parameters: {
					jsCode: "const out = {};\\nout.total = $input.all().length;\\nreturn $('Start').all().map((i) => ({ json: { s: i.json.subject, n: out.total } }));",
				},
			}),
		),
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
		const getAsCode = async (json: WorkflowJSON) => {
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
		};

		for (const json of [seed, withRetry]) {
			const { code } = await getAsCode(json);
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
});
