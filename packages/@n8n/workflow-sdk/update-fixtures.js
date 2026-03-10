const { transpileWorkflowJS } = require('./dist/simplified-compiler');
const fs = require('fs');
const path = require('path');
const fixturesDir = 'src/simplified-compiler/__fixtures__';
const dirs = fs.readdirSync(fixturesDir).filter((d) => d.startsWith('w'));
let updated = 0;
for (const dir of dirs) {
	const inputPath = path.join(fixturesDir, dir, 'input.js');
	const outputPath = path.join(fixturesDir, dir, 'output.js');
	if (!fs.existsSync(inputPath) || !fs.existsSync(outputPath)) continue;
	const input = fs.readFileSync(inputPath, 'utf8');
	const result = transpileWorkflowJS(input);
	const newOutput = result.code.trim() + '\n';
	const oldOutput = fs.readFileSync(outputPath, 'utf8');
	if (newOutput !== oldOutput) {
		fs.writeFileSync(outputPath, newOutput);
		updated++;
		console.log('Updated:', dir);
	}
}
console.log('Total updated:', updated);
