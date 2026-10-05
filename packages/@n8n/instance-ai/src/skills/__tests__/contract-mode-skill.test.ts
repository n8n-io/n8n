import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { TOP_LEVEL_ITEM_CEILING } from 'n8n-workflow';

import { resolvePromptProfile } from '../../prompts/prompt-profiles';
import { nextNodeIds } from '../../tools/next-modules';
import { loadInstanceAiPromptSkills, substituteSkillPlaceholders } from '../runtime-skills';

const skillDir = path.join(__dirname, '../../../skills/workflow-builder-contracts');
const skill = readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
const readReference = (name: string) =>
	readFileSync(path.join(skillDir, 'references', name), 'utf8');
const flowControl = readReference('flow-control.md');
const aiNodes = readReference('ai-nodes.md');
const binary = readReference('binary.md');
const tsBlocks = (text: string) =>
	[...text.matchAll(/```ts\n([\s\S]*?)```/g)].map(([, code]) => code);

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

	it('teaches trigger samples, settings, onError in the list, and setup placeholders', () => {
		expect(skill).toContain('manual({ sample:');
		expect(skill).toContain(
			'- Typed steps, `set` and `node()` take `settings: { retryOnFail: true',
		);
		expect(skill).toContain('`nodeModules` and `builtIns`');
		expect(skill).toMatch(/\}\),\n {2}onError\(set\(\{ name: 'Log'/);
		expect(skill).toContain("placeholder('Database')");
		expect(skill).not.toContain("'<Notion tasks database ID>'");
		expect(skill).toContain('do not read SDK files');
		expect(skill).toContain(
			'Only `build-workflow` has\n`@n8n/nodes/*` and runs `tsc`: do not run it.',
		);
	});

	it('sets nested fields and keeps input fields with set', () => {
		expect(skill).toContain("a key `'a.b'` nests");
		expect(skill).toContain("`keep: 'all'`,\n  `{ selected }` or `{ except }` keeps input fields.");
	});

	it('teaches AI providers and agent tools in the ai-nodes reference', () => {
		expect(aiNodes).toContain('providers: { model: lmChatOpenAi.execute({');
		expect(aiNodes).toContain(
			"httpRequest.getTool({ name: 'Fetch', url: fromModel('The page URL') })",
		);
		expect(aiNodes).toContain('`model-selection` skill');
		expect(`${skill}${aiNodes}`).not.toContain('subnode');
		expect(skill).not.toContain('providers:');
	});

	it('teaches binary keys and which steps keep files in the binary reference', () => {
		expect(binary).toContain('`file: (item) => item.binary.data`');
		expect(binary).toContain('`httpRequest.download`: `data`');
		expect(binary).toContain('a multipart file is under its form field name');
		expect(binary).toContain('`attachment_0`');
		expect(binary).toContain(
			'`set` and an action that outputs an API response make new items without\n  the files.',
		);
	});

	it('ends an error branch with onError, joins it with recover, and writes expressions with expr()', () => {
		expect(skill).toContain('its branch ends.\n  `recover(part)` joins it back.');
		expect(skill).toContain(
			"`expr('{{ … }}')` fits a value field, not `if`, `until` or a binary field.",
		);
		expect(skill).not.toContain("'={{");
	});

	it('builds a flat list and names the macros in the skill', () => {
		expect(skill).toContain('A workflow is a flat list: a trigger, then parts.');
		expect(skill).toContain(
			"Give an HTTP step `schema`, the body's JSON Schema from its API docs:",
		);
		expect(skill).not.toMatch(/\.andThen|\.orElse|\.branch\(/);
		expect(skill).not.toContain('WorkflowJSON');
	});

	it('routes, joins and loops with macros in the flow-control reference', () => {
		expect(flowControl).toContain('`steps(a, b, …)` for several');
		expect(flowControl).toContain('`when({ name, if: (item) => … }, { then: part, else: part })`');
		expect(flowControl).toContain('To act on\n  the false items only, negate the condition.');
		expect(flowControl).toContain('`switchOn({ name, on }, { value: part, fallback: part })`');
		expect(flowControl).toContain('`merge({ name, join }, [part, part, …])`');
		expect(flowControl).toContain(
			"`join` is `'append'`, `'position'` or `{ left, right }`. These are not the\n  Merge node action names.",
		);
		expect(flowControl).toContain('`loop({ name, maxIterations, until, next?, onLimit? }, body)`');
		expect(flowControl).toContain('a failed item is only\n  `{ error: string }`');
		expect(flowControl).toContain('`route(step, { a: part, b: part })`');
		expect(flowControl).toContain('Use it only to pace work');
	});

	it('has a flow-control example that type-checks against the new SDK', { timeout: 30_000 }, () => {
		const blocks = tsBlocks(flowControl);

		expect(blocks).toHaveLength(1);
		expect(blocks.flatMap(typeErrors)).toEqual([]);
		expect(
			typeErrors(blocks[0].replace('(out) => out.n >= 3', '(out) => out.count >= 3')).join('\n'),
		).toContain("Property 'count' does not exist");
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
		expect(next).toContain('If the trigger accepts all data, omit `workflowInputs`');
		expect(
			on.source.registry.skills
				.find(({ id }) => id === 'workflow-builder')
				?.linkedFiles.references.map(({ path }) => path),
		).toEqual([
			'references/ai-nodes.md',
			'references/binary.md',
			reference,
			'references/error-workflows.md',
			'references/flow-control.md',
		]);
		expect(
			off.source.registry.skills
				.find(({ id }) => id === 'workflow-builder')
				?.linkedFiles.references.map(({ path }) => path),
		).toEqual([reference, 'references/error-workflows.md']);
		await expect(
			off.source.loadFile?.('workflow-builder', 'references/flow-control.md'),
		).resolves.toBeNull();
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
			const blocks = tsBlocks(readReference('error-workflows.md'));

			expect(blocks).toHaveLength(1);
			expect(blocks.flatMap(typeErrors)).toEqual([]);
			expect(
				typeErrors(blocks[0].replace("{ errorWorkflow: '", "{ errorWorkflowId: '")).join('\n'),
			).toContain("'errorWorkflowId' does not exist");
		},
	);

	it('names the box ceiling in a core rule, and flow-control teaches group(), its boundary and the opt-out', () => {
		const text = substituteSkillPlaceholders(skill);
		expect(text).toContain(
			`4. Over ${TOP_LEVEL_ITEM_CEILING} boxes (a node, loop or group is one), also\n   after an edit, wrap each stage in \`group()\`.`,
		);
		expect(skill).toContain('`forEach`, `loop` or `group`.');
		expect(flowControl).toContain('`group({ name, description }, steps(…))`');
		expect(flowControl).toContain(
			'The paths of a `when` or `switchOn`\n  join at the next step: put that step in the same group',
		);
		expect(flowControl).toContain("`groupingDecision: 'not_warranted'` and a `groupingReason`.");
	});

	it('makes the loop state with a set before the loop', () => {
		expect(flowControl).toContain('The state is the item before `loop`: `set` it first.');
		expect(flowControl).toContain(
			'A loop body ends with a `set` of the state fields; then `next` is\n  optional.',
		);
	});

	it('names every reference file in the References block, and only existing files', () => {
		const block = skill.slice(skill.indexOf('## References'), skill.indexOf('## Imports'));
		const pointers = [...block.matchAll(/^- `(references\/[\w-]+\.md)`: /gm)].map(
			([, file]) => file,
		);
		const files = readdirSync(path.join(skillDir, 'references')).map(
			(file) => `references/${file}`,
		);

		expect(block).toContain('in the\n`nodes(action="search")` step');
		expect(pointers.toSorted()).toEqual(files.toSorted());
	});

	it('stays small', () => {
		expect(Buffer.byteLength(skill)).toBeLessThan(4_400);
		const caps: Record<string, number> = {
			'ai-nodes.md': 1_000,
			'binary.md': 1_200,
			'compositional-workflows.md': 2_400,
			'error-workflows.md': 2_000,
			'flow-control.md': 2_400,
		};
		const sizes = Object.fromEntries(
			readdirSync(path.join(skillDir, 'references')).map((file) => [
				file,
				Buffer.byteLength(readReference(file)),
			]),
		);

		expect(Object.keys(sizes).toSorted()).toEqual(Object.keys(caps).toSorted());
		for (const [file, bytes] of Object.entries(sizes)) expect(bytes).toBeLessThan(caps[file]);
	});
});
