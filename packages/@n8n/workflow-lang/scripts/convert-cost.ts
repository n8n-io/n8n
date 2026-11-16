/**
 * The cost record of converted workflows (`src/convert/__tests__/cost.generated.ts`).
 *
 *   node scripts/convert-cost.ts           prints each case and fails when a cost rises
 *   node scripts/convert-cost.ts --write   writes the record
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONVERT_COST } from '../src/convert/__tests__/cost.generated.ts';
import { measureCosts, recordSource, totalOps } from '../src/convert/__tests__/cost-cases.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = process.argv.includes('--write');
const costs = measureCosts();

let risen = 0;
for (const name of Object.keys(costs).sort()) {
	const [ops, allocations] = costs[name];
	const record = CONVERT_COST[name];
	const higher = record !== undefined && (ops > record[0] || allocations > record[1]);
	if (higher) risen++;
	const before = record === undefined ? 'new' : `record ${record[0]} / ${record[1]}`;
	console.log(
		`${higher ? 'HIGHER ' : ''}${name}: instructions ${ops}, allocations ${allocations} (${before})`,
	);
}
for (const prefix of ['corpus/', 'convert/']) {
	console.log(
		`total ${prefix}: instructions ${totalOps(costs, prefix)} (record ${totalOps(CONVERT_COST, prefix)})`,
	);
}

if (write) {
	writeFileSync(join(here, '../src/convert/__tests__/cost.generated.ts'), recordSource(costs));
	console.log('The record is written.');
} else if (risen > 0) {
	console.error(`${risen} case(s) cost more than the record.`);
	process.exit(1);
}
