import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { compareOperations, findBreakingChanges, loadProperties } from './contract';
import { generate } from './generate';
import { N8N_NODE_CONFIG } from './n8n-node.config';

const listOf = (title: string, items: string[]) =>
	items.length > 0 ? [title, ...items.map((item) => `- ${item}`)] : [];

function fail(lines: string[]) {
	console.error(`\n${lines.join('\n')}`);
	process.exitCode = 1;
}

async function main() {
	const { check, base } = parseArgs({
		options: { check: { type: 'boolean', default: false }, base: { type: 'string' } },
	}).values;
	if (base !== undefined && !check) {
		fail(['--base works only with --check.']);
		return;
	}
	const { report, errors, properties, content } = await generate(N8N_NODE_CONFIG);
	console.log(report);
	if (errors.length > 0) {
		fail(listOf('The node cannot be generated:', errors));
		return;
	}

	if (base !== undefined) {
		const breaks = findBreakingChanges(await loadProperties(base), properties);
		if (breaks.length > 0) {
			fail([
				...listOf('These changes break saved workflows:', breaks),
				'See "Breaking changes" in packages/@n8n/n8n-node-codegen/README.md.',
			]);
		} else {
			console.log('\nNo breaking changes.');
		}
	}

	const file = N8N_NODE_CONFIG.outputFile;
	const name = path.relative(process.cwd(), file);
	const committed = await readFile(file, 'utf8').catch(() => undefined);
	if (committed === content) {
		console.log(`\n${name} is up to date.`);
	} else if (check) {
		const { added, removed } = compareOperations(
			committed === undefined ? [] : await loadProperties(file),
			properties,
		);
		fail([
			`${name} is out of date. Run: pnpm --filter @n8n/n8n-node-codegen generate`,
			...listOf(
				'These operations are not in the file yet. Test them, or add them to exclude in overrides.ts with a reason:',
				added,
			),
			...listOf('These operations are still in the file, but not in the node:', removed),
		]);
	} else {
		await writeFile(file, content);
		console.log(`\nWrote ${name}.`);
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
