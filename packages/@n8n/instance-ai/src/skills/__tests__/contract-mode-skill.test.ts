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

	it('lists the typed modules and sends every other node to node()', () => {
		const text = substituteSkillPlaceholders(skill);
		expect(text).toContain(
			`The only typed modules are\n${nextNodeIds.map((id) => `\`${id}\``).join(', ')}:`,
		);
		expect(text).toContain('Every other node uses `node()`.');
		expect(text).not.toContain('{{NODE_CONTRACT_MODULES_PLACEHOLDER}}');
	});

	it('teaches AI sub-nodes, trigger samples, orElse on the flow, and setup placeholders', () => {
		expect(skill).toContain('subnodes: { model: subnode({');
		expect(skill).toContain('manual({ sample:');
		expect(skill).toMatch(/\)\n {4}\.orElse\(\(failed\) => failed\.andThen\(/);
		expect(skill).toContain("placeholder('Database')");
		expect(skill).not.toContain("'<Notion tasks database ID>'");
		expect(skill).toContain('do not read SDK files');
	});

	it('stays small', () => {
		expect(Buffer.byteLength(skill)).toBeLessThan(5_000);
	});
});
