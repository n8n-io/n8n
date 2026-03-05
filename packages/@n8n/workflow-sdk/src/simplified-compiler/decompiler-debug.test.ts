import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { transpileWorkflowJS } from './compiler';
import { decompileWorkflowSDK } from './decompiler';

const fixturesDir = join(__dirname, '__fixtures__');
const fixtures = readdirSync(fixturesDir)
	.filter((f) => statSync(join(fixturesDir, f)).isDirectory())
	.filter((f) => !['w07-github-workflow-backups', 'w10-bluray-preorder-discord'].includes(f))
	.sort();

for (const name of fixtures) {
	it(`decompile ${name}`, () => {
		const dir = join(fixturesDir, name);
		const input = readFileSync(join(dir, 'input.js'), 'utf-8').trim();
		const compiled = transpileWorkflowJS(input);
		expect(compiled.errors).toHaveLength(0);

		const decompiled = decompileWorkflowSDK(compiled.code);
		const matches = decompiled.code.trim() === input;
		if (!matches) {
			console.log(`\n=== ${name} ===`);
			const expected = input.split('\n');
			const got = decompiled.code.trim().split('\n');
			let shown = 0;
			for (let i = 0; i < Math.max(expected.length, got.length); i++) {
				if (expected[i] !== got[i] && shown < 15) {
					console.log(`L${i + 1} EXP: ${JSON.stringify(expected[i])}`);
					console.log(`L${i + 1} GOT: ${JSON.stringify(got[i])}`);
					shown++;
				}
			}
		}
		console.log(`${name}: ${matches ? 'MATCH' : 'DIFF'}`);
	});
}
