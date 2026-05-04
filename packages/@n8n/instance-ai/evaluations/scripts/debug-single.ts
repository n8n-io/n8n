// Debug a single prompt through the in-process builder and print the
// result (captured workflow if any, error class, interactivity stats).
// Use this to investigate `no_workflow_built` failures in a pairwise run.
//
// Requires the same sandbox env vars as pairwise (DAYTONA_API_URL/KEY by
// default, or N8N_INSTANCE_AI_SANDBOX_PROVIDER=local for a local runner).

import { BuilderSandboxFactory } from '../../src/workspace/builder-sandbox-factory';
import { SnapshotManager } from '../../src/workspace/snapshot-manager';
import { buildInProcess } from '../harness/in-process-builder';
import { resolveSandboxConfig } from '../harness/sandbox-config';

async function main(): Promise<void> {
	const prompt = process.argv.slice(2).join(' ');
	if (!prompt) {
		console.error('usage: tsx evaluations/scripts/debug-single.ts "<prompt>"');
		process.exit(1);
	}

	const sandboxConfig = resolveSandboxConfig(process.env);
	if (!sandboxConfig.enabled) {
		throw new Error('Sandbox config is unexpectedly disabled.');
	}
	const silentLogger = {
		debug: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
	};
	const imageManager =
		sandboxConfig.provider === 'daytona'
			? new SnapshotManager(sandboxConfig.image, silentLogger, undefined)
			: undefined;
	const sandboxFactory = new BuilderSandboxFactory(sandboxConfig, imageManager, silentLogger);

	const result = await buildInProcess({ prompt, sandboxFactory });

	console.log('\n=== BUILD RESULT ===');
	console.log('success:', result.success);
	console.log('duration:', result.durationMs, 'ms');
	console.log('errorClass:', result.errorClass ?? 'none');
	console.log('errorMessage:', result.errorMessage ?? 'none');
	console.log('interactivity:', result.interactivity);
	console.log('\n=== FINAL TEXT ===');
	console.log(result.finalText ?? '(no text captured)');
	console.log('\n=== CAPTURED WORKFLOW ===');
	if (result.workflow) {
		console.log(JSON.stringify(result.workflow, null, 2).substring(0, 4000));
	} else {
		console.log('(none)');
	}
	if (result.extraWorkflows.length > 0) {
		console.log(`\n(plus ${result.extraWorkflows.length} extra workflow(s) — not shown)`);
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
		process.exit(1);
	});
}
