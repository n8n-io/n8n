import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';

import { resolvePromptProfile } from '../../prompts/prompt-profiles';
import { nextNodeIds } from '../../tools/next-modules';
import { loadInstanceAiPromptSkills, substituteSkillPlaceholders } from '../runtime-skills';

const skillDir = path.join(__dirname, '../../../skills/workflow-builder-contracts');
const skill = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');

const TSC = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');

/** The `tsc` errors of `source` against `@n8n/workflow-sdk/next`, as the sandbox build checks it. */
function typeErrors(source: string): string[] {
	const root = mkdtempSync(path.join(tmpdir(), 'contract-skill-'));
	try {
		writeFileSync(path.join(root, 'workflow.ts'), source);
		const sdk = require.resolve('@n8n/workflow-sdk/next').replace(/\.js$/, '.d.ts');
		const compilerOptions = {
			strict: true,
			noEmit: true,
			skipLibCheck: true,
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			types: [],
			paths: { '@n8n/workflow-sdk/next': [sdk] },
		};
		writeFileSync(
			path.join(root, 'tsconfig.json'),
			JSON.stringify({ compilerOptions, files: ['workflow.ts'] }),
		);
		try {
			execFileSync(process.execPath, [TSC, '-p', root, '--pretty', 'false'], { encoding: 'utf8' });
			return [];
		} catch (error) {
			const output = (error as { stdout?: string }).stdout ?? String(error);
			return output.split('\n').filter((line) => line.includes('error TS'));
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

describe('contract-mode skill', () => {
	it('imports the flow API and the node modules of the new SDK', () => {
		expect(skill).toContain("from '@n8n/workflow-sdk/next'");
		expect(skill).toContain("import { notion } from '@n8n/nodes/notion'");
		expect(skill).toContain('`@n8n/nodes/<id>`');
		expect(skill).not.toContain("from '@n8n/workflow-sdk';");
	});

	it('searches once for every service and builds from sourceCode', () => {
		expect(skill).toContain('`nodes(action="search")` ONCE with `queries`');
		expect(skill).toContain('`sourceCode`');
		expect(skill).toContain('`workspace_str_replace_file`');
	});

	it('lists the typed modules, names the derived module path, and keeps node() for a type without one', () => {
		const text = substituteSkillPlaceholders(skill);
		expect(text).toContain(
			`The typed modules are\n${nextNodeIds.map((id) => `\`${id}\``).join(', ')}:`,
		);
		expect(text).toContain('derived module at\n`@n8n/nodes/<package>/<name>`');
		expect(text).toContain('Use `node()` only for a type without one.');
		expect(text).not.toContain('{{NODE_CONTRACT_MODULES_PLACEHOLDER}}');
	});

	it('teaches AI providers, trigger samples, onError in the list, and setup placeholders', () => {
		expect(skill).toContain('providers: { model: lmChatOpenAi.execute({');
		expect(skill).toContain(
			"httpRequest.getTool({ name: 'Fetch', url: fromModel('The page URL') })",
		);
		expect(skill).not.toContain('subnode');
		expect(skill).toContain('manual({ sample:');
		expect(skill).toContain('`settings: { retryOnFail: true');
		expect(skill).toContain('`nodeModules` and `builtIns`');
		expect(skill).toMatch(/\}\),\n {2}onError\(set\(\{ name: 'Log'/);
		expect(skill).toContain("placeholder('Database')");
		expect(skill).not.toContain("'<Notion tasks database ID>'");
		expect(skill).toContain('do not read SDK files');
		expect(skill).toContain(
			'Only `build-workflow` has\n`@n8n/nodes/*` and runs `tsc`: do not run it.',
		);
	});

	it('ends an error branch with onError, joins it with recover, and writes expressions with expr()', () => {
		expect(skill).toContain('its branch ends.\n  `recover(part)` joins it back.');
		expect(skill).toContain(
			"`expr('{{ … }}')` fits a value field, not `if`, `until` or a binary field.",
		);
		expect(skill).not.toContain("'={{");
	});

	it('builds a flat list, and routes, joins and loops with macros, not WorkflowJSON', () => {
		expect(skill).toContain('A workflow is a flat list: a trigger, then parts.');
		expect(skill).toContain('`steps(a, b, …)` for several');
		expect(skill).toContain('`switchOn({ name, on }, { value: part, fallback: part })`');
		expect(skill).toContain('`merge({ name, join }, [part, part, …])`');
		expect(skill).toContain('`loop({ name, maxIterations, until, next?, onLimit? }, body)`');
		expect(skill).toContain('`route(step, { a: part, b: part })`');
		expect(skill).not.toMatch(/\.andThen|\.orElse|\.branch\(/);
		expect(skill).not.toContain('WorkflowJSON');
	});

	it('tells the user to type a field value without the leading =', () => {
		expect(skill).toContain(
			'- A value you tell the user to type never starts with `=`: the editor adds it.',
		);
	});

	it('serves a compositional-workflows reference in the new SDK shape only when node contracts are enabled', async () => {
		const { profile } = resolvePromptProfile({});
		const reference = 'references/compositional-workflows.md';
		const off = await loadInstanceAiPromptSkills(profile);
		const on = await loadInstanceAiPromptSkills(profile, { nodeContractsEnabled: true });

		const legacy = (await off.source.loadFile?.('workflow-builder', reference))?.content ?? '';
		const next = (await on.source.loadFile?.('workflow-builder', reference))?.content ?? '';

		expect(legacy).toContain('config: {');
		expect(next).not.toMatch(/config: \{|typeVersion:|trigger\(\{\n {2}type/);
		expect(next).toContain(
			"import { executeWorkflowTrigger } from '@n8n/nodes/n8n-nodes-base/executeWorkflowTrigger';",
		);
		expect(next).toContain(
			"node({\n  name: 'Get Weather Data',\n  type: 'n8n-nodes-base.executeWorkflow',\n  version: 1.2,\n  parameters: {",
		);
		expect(
			on.source.registry.skills
				.find(({ id }) => id === 'workflow-builder')
				?.linkedFiles.references.map(({ path }) => path),
		).toEqual([reference, 'references/error-workflows.md']);
	});

	it('serves an error-workflows reference in the new SDK shape only when node contracts are enabled', async () => {
		const { profile } = resolvePromptProfile({});
		const reference = 'references/error-workflows.md';
		const off = await loadInstanceAiPromptSkills(profile);
		const on = await loadInstanceAiPromptSkills(profile, { nodeContractsEnabled: true });

		const legacy = (await off.source.loadFile?.('workflow-builder', reference))?.content ?? '';
		const next = (await on.source.loadFile?.('workflow-builder', reference))?.content ?? '';

		expect(legacy).toContain(".settings({ errorWorkflow: 'published-error-workflow-id' })");
		expect(next).not.toContain('.settings(');
		expect(next).toContain(
			"{ name: 'Target Workflow', settings: { errorWorkflow: 'published-error-workflow-id' } },",
		);
	});

	// Each case runs a real tsc.
	it(
		'has error-workflows examples that type-check against the new SDK',
		{ timeout: 30_000 },
		() => {
			const reference = readFileSync(path.join(skillDir, 'references/error-workflows.md'), 'utf8');
			const blocks = [...reference.matchAll(/```ts\n([\s\S]*?)```/g)].map(([, code]) => code);

			expect(blocks).toHaveLength(1);
			expect(blocks.flatMap(typeErrors)).toEqual([]);
			expect(
				typeErrors(blocks[0].replace("{ errorWorkflow: '", "{ errorWorkflowId: '")).join('\n'),
			).toContain("'errorWorkflowId' does not exist");
		},
	);

	it('teaches group() and the grouping opt-out over the box ceiling', () => {
		const text = substituteSkillPlaceholders(skill);
		expect(text).toContain(
			`3. Over ${TOP_LEVEL_ITEM_CEILING} boxes, wrap stages in \`group({ name }, part)\`\n   or pass \`groupingDecision: 'not_warranted'\` and a \`groupingReason\`.`,
		);
	});

	it('stays small', () => {
		expect(Buffer.byteLength(skill)).toBeLessThan(5_200);
	});
});
