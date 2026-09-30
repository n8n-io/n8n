import { actions } from '@n8n/nodes-base-next';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const skill = readFileSync(
	path.join(__dirname, '../../../skills/workflow-builder-contracts/SKILL.md'),
	'utf8',
);

describe('contract-mode skill', () => {
	it('lists every nodes-base-next action', () => {
		expect(actions.map(({ id }) => id).filter((id) => !skill.includes(`\`${id}\``))).toEqual([]);
	});

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

	it('stays small', () => {
		expect(Buffer.byteLength(skill)).toBeLessThan(6_000);
	});
});
