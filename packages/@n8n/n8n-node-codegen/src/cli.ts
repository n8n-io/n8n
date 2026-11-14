import { generate } from './generate';
import { N8N_NODE_CONFIG } from './n8n-node.config';

async function main() {
	const { report, errors } = await generate(N8N_NODE_CONFIG);
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
