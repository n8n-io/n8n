import { readFileSync } from 'node:fs';
import path from 'node:path';

import { CONTRACTS } from '../../node-contracts/contracts';

it('lists every action contract in the contract-mode skill', () => {
	const skill = readFileSync(
		path.join(__dirname, '../../../skills/workflow-builder-contracts/SKILL.md'),
		'utf8',
	);
	expect(CONTRACTS.map(({ id }) => id).filter((id) => !skill.includes(`\`${id}\``))).toEqual([]);
});
