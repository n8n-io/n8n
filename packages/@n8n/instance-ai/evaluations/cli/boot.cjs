/**
 * Unified eval CLI boot script.
 *
 * Preloads @mastra/core (for subagent mode), registers tsx, then dispatches
 * to the appropriate harness based on the first positional argument:
 *
 *   node evaluations/cli/boot.cjs e2e [args]        → e2e workflow evaluation
 *   node evaluations/cli/boot.cjs subagent [args]    → isolated sub-agent evaluation
 *   node evaluations/cli/boot.cjs                    → show usage
 */
require('../subagent/preload-mastra.cjs');
require('tsx/cjs');

const command = process.argv[2];

switch (command) {
	case 'e2e':
		// Strip the command from argv so the e2e CLI sees its own args
		process.argv.splice(2, 1);
		require('./index.ts');
		break;

	case 'subagent':
		process.argv.splice(2, 1);
		require('../subagent/cli.ts');
		break;

	default:
		console.log('Instance AI Evaluation Harness\n');
		console.log('Usage: pnpm eval:instance-ai <command> [options]\n');
		console.log('Commands:');
		console.log('  e2e        Run end-to-end workflow evaluation (requires running n8n)');
		console.log('  subagent   Run isolated sub-agent evaluation (no n8n required)\n');
		console.log('Examples:');
		console.log('  pnpm eval:instance-ai e2e --filter contact-form --verbose');
		console.log('  pnpm eval:instance-ai subagent --prompt "Build a webhook workflow" --verbose');
		console.log('  pnpm eval:instance-ai subagent --dataset my-dataset --experiment my-exp');
		process.exit(command === undefined ? 0 : 1);
}
