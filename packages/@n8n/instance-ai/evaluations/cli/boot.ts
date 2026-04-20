#!/usr/bin/env -S tsx
/**
 * Unified eval CLI dispatcher.
 *
 * Dispatches to the appropriate harness based on the first positional arg.
 * Run via `tsx` — no module-loading hooks required.
 *
 *   tsx evaluations/cli/boot.ts e2e [args]        → e2e workflow evaluation
 *   tsx evaluations/cli/boot.ts subagent [args]   → sub-agent evaluation (live n8n)
 *   tsx evaluations/cli/boot.ts                   → show usage
 */

async function main(): Promise<void> {
	const command = process.argv[2];

	switch (command) {
		case 'e2e':
			process.argv.splice(2, 1);
			await import('./index');
			return;

		case 'subagent':
			process.argv.splice(2, 1);
			await import('../subagent/cli');
			return;

		default:
			console.log('Instance AI Evaluation Harness\n');
			console.log('Usage: pnpm eval:instance-ai <command> [options]\n');
			console.log('Commands:');
			console.log('  e2e        Run end-to-end workflow evaluation (requires running n8n)');
			console.log('  subagent   Run sub-agent evaluation against a live n8n instance\n');
			console.log('Examples:');
			console.log('  pnpm eval:instance-ai e2e --filter contact-form --verbose');
			console.log('  pnpm eval:instance-ai subagent --prompt "Build a webhook workflow" --verbose');
			console.log('  pnpm eval:instance-ai subagent --dataset my-dataset --experiment my-exp');
			process.exit(command === undefined ? 0 : 1);
	}
}

void main();
