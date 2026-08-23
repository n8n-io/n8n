// One-off renderer: reads computer-use-eval-results.json and writes a
// matching .html beside it. Convenient when you already have a report and
// don't want to re-run the eval just to refresh the HTML.

import { jsonParse } from 'n8n-workflow';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderHtml } from './report-html';
import type { RunReport } from './types';

const inputPath = resolve(process.argv[2] ?? '.eval-output/computer-use-eval-results.json');
const outputPath = inputPath.replace(/\.json$/, '.html');

const report = jsonParse<RunReport>(readFileSync(inputPath, 'utf-8'), {
	errorMessage: `Invalid JSON in ${inputPath}`,
});
writeFileSync(outputPath, renderHtml(report), 'utf-8');

console.log(`HTML written to ${outputPath}`);
