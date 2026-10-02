import { readFileSync } from 'node:fs';
import path from 'node:path';

import { nextNodeIds } from '../../tools/next-modules';
import { substituteSkillPlaceholders } from '../runtime-skills';

const skill = readFileSync(
	path.join(__dirname, '../../../skills/workflow-builder-contracts/SKILL.md'),
	'utf8',
);

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
		expect(skill).toContain("`expr('{{ … }}')` fits any lambda field.");
		expect(skill).not.toContain("'={{");
	});

	it('builds a flat list, and routes, joins and loops with macros, not WorkflowJSON', () => {
		expect(skill).toContain('A workflow is a flat list: a trigger, then parts.');
		expect(skill).toContain('`steps(a, b, …)` for several');
		expect(skill).toContain('`switchOn({ name, on }, { value: part, fallback: part })`');
		expect(skill).toContain('`merge({ name, join }, [part, part])`');
		expect(skill).toContain('`route(step, { a: part, b: part })`');
		expect(skill).not.toMatch(/\.andThen|\.orElse|\.branch\(/);
		expect(skill).not.toContain('WorkflowJSON');
	});

	it('stays small', () => {
		expect(Buffer.byteLength(skill)).toBeLessThan(5_200);
	});
});
