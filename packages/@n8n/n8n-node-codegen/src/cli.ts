import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generate } from './generate';
import { N8N_NODE_CONFIG } from './n8n-node.config';

async function main() {
	const check = process.argv.includes('--check');
	const { report, errors, content } = await generate(N8N_NODE_CONFIG);
	console.log(report);
	if (errors.length > 0) {
		console.error(`\nThe node cannot be generated:\n- ${errors.join('\n- ')}`);
		process.exitCode = 1;
		return;
	}

	const file = N8N_NODE_CONFIG.outputFile;
	const name = path.relative(process.cwd(), file);
	const committed = await readFile(file, 'utf8').catch(() => undefined);
	if (committed === content) {
		console.log(`\n${name} is up to date.`);
	} else if (check) {
		console.error(`\n${name} is out of date. Run: pnpm --filter @n8n/n8n-node-codegen generate`);
		process.exitCode = 1;
	} else {
		await writeFile(file, content);
		console.log(`\nWrote ${name}.`);
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
