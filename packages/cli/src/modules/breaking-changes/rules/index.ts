import glob from 'fast-glob';
import { join } from 'node:path';

// Auto-discover all rule files across all version directories (v2, v3, etc.).
// The @BreakingChangeRule decorator on each class handles registration when the file is loaded.
export async function loadAllRules() {
	const ruleFiles = await glob('./**/*.rule.{js,ts}', {
		ignore: ['**/__tests__/**'],
		cwd: __dirname,
	});
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	await Promise.all(ruleFiles.map(async (file) => await import(join(__dirname, file))));
}
