import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export interface LintLoopResult {
	iterations: number;
	clean: boolean;
	lastOutput: string;
}

/**
 * Run eslint from packages/nodes-base against the new folder only.
 * Uses the real nodes-base config (includes eslint-plugin-n8n-nodes-base).
 */
function isToolingFailure(output: string): boolean {
	return (
		output.includes('ERR_MODULE_NOT_FOUND') ||
		output.includes('Cannot find module') ||
		output.includes('Something went wrong') ||
		output.includes('command line flags are no longer available')
	);
}

function listLintTargets(nodeDir: string, nodesBaseDir: string): string[] {
	const targets: string[] = [];

	const walk = (dir: string) => {
		for (const entry of readdirSync(dir)) {
			if (entry === 'credentials-draft') continue;
			const full = join(dir, entry);
			const st = statSync(full);
			if (st.isDirectory()) {
				walk(full);
			} else if (/\.(ts|js)$/.test(entry)) {
				targets.push(relative(nodesBaseDir, full));
			}
		}
	};

	walk(nodeDir);
	return targets;
}

export function runLintLoop(
	repoRoot: string,
	folderName: string,
	maxIterations = 5,
): LintLoopResult {
	const nodesBaseDir = resolve(repoRoot, 'packages', 'nodes-base');
	const nodeDir = join(nodesBaseDir, 'nodes', folderName);
	const targets = listLintTargets(nodeDir, nodesBaseDir);

	if (targets.length === 0) {
		return { iterations: 0, clean: true, lastOutput: 'No TypeScript files to lint.' };
	}

	let lastOutput = '';
	let clean = false;
	let iterations = 0;

	for (let i = 0; i < maxIterations; i++) {
		iterations = i + 1;
		console.log(
			`\n[lint] iteration ${iterations}: eslint --fix (${targets.length} files, excluding credentials-draft)`,
		);

		const fix = spawnSync('pnpm', ['exec', 'eslint', ...targets, '--fix'], {
			cwd: nodesBaseDir,
			encoding: 'utf8',
			shell: process.platform === 'win32',
		});

		lastOutput = `${fix.stdout ?? ''}${fix.stderr ?? ''}`;
		if (isToolingFailure(lastOutput)) {
			console.log(lastOutput.slice(0, 1500));
			console.log(
				'[lint] ESLint tooling is not ready (build @n8n/eslint-config / install monorepo deps). Stopping lint loop.',
			);
			break;
		}
		if (fix.status !== 0 && lastOutput.trim()) {
			console.log(lastOutput.slice(0, 2000));
		}

		console.log(`[lint] iteration ${iterations}: eslint (check)`);
		const check = spawnSync('pnpm', ['exec', 'eslint', ...targets, '--quiet'], {
			cwd: nodesBaseDir,
			encoding: 'utf8',
			shell: process.platform === 'win32',
		});

		lastOutput = `${check.stdout ?? ''}${check.stderr ?? ''}`;
		if (isToolingFailure(lastOutput)) {
			console.log(lastOutput.slice(0, 1500));
			console.log('[lint] ESLint tooling is not ready. Stopping lint loop.');
			break;
		}
		if (check.status === 0) {
			clean = true;
			console.log('[lint] clean');
			break;
		}

		console.log(lastOutput.slice(0, 2000));
		console.log('[lint] residual issues remain; retrying…');
	}

	return { iterations, clean, lastOutput };
}
