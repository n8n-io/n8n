import { generate } from './generate';
import { findRepoRoot, n8nNodeConfig } from './n8n-node.config';

async function main() {
	const { report, errors } = await generate(n8nNodeConfig(findRepoRoot(process.cwd())));
	console.log(report);
	if (errors.length > 0) {
		console.error(`\nThe node cannot be generated:\n- ${errors.join('\n- ')}`);
		process.exitCode = 1;
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
