/**
 * CLI for harvesting missing output schemas from nodes-base's own workflow
 * test fixtures. Never overwrites an existing schema file.
 *
 * Usage:
 *   pnpm schema-harvest              # writes new __schema__ json files
 *   pnpm schema-harvest --dry-run    # reports what would be written
 */

import * as path from 'path';

import { harvestOutputSchemas } from './schema-harvest';

const NODES_BASE_NODES_DIR = path.resolve(__dirname, '../../../../nodes-base/nodes');

function main(): void {
	const dryRun = process.argv.includes('--dry-run');
	const result = harvestOutputSchemas({ nodesRootDir: NODES_BASE_NODES_DIR, dryRun });

	console.log(
		`${dryRun ? 'Would write' : 'Wrote'} ${result.written.length} schema file(s) from ${result.written.length + result.skippedExisting.length + result.unmapped.length} fixture(s) scanned.`,
	);
	console.log(`Skipped (already covered): ${result.skippedExisting.length}`);
	console.log(`Unmapped (could not derive a schema): ${result.unmapped.length}`);

	if (result.written.length > 0) {
		console.log('\nWritten:');
		for (const entry of result.written) {
			console.log(`  ${path.relative(NODES_BASE_NODES_DIR, entry.filePath)}`);
		}
	}

	if (result.unmapped.length > 0) {
		const byReason = new Map<string, number>();
		for (const entry of result.unmapped) {
			byReason.set(entry.reason, (byReason.get(entry.reason) ?? 0) + 1);
		}
		console.log('\nUnmapped reasons:');
		for (const [reason, count] of byReason) {
			console.log(`  ${reason}: ${count}`);
		}
	}
}

if (require.main === module) {
	main();
}
