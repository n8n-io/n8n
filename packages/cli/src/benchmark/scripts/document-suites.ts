import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { collectSuites } from '../lib';
import type { Suites } from '../lib/types';

function toSuitesList(suites: Suites) {
	let list = '';

	for (const [fullPath, suite] of Object.entries(suites)) {
		list += `\n### ${suite.name}` + '\n\n';

		list += 'Suite file: `' + fullPath.split('/').pop() + '`\n\n';

		for (const task of suite.tasks) {
			list += task.description.replace(suite.name, '').trim() + '\n';
		}
	}

	return list;
}

async function documentSuites() {
	const filePath = path.resolve('src', 'benchmark', 'benchmark.md');
	const oldDoc = await fs.readFile(filePath, 'utf8');

	const MARK_START = '<!-- BENCHMARK_SUITES_LIST -->';
	const MARK_END = '<!-- /BENCHMARK_SUITES_LIST -->';

	const before = oldDoc.slice(0, oldDoc.indexOf(MARK_START) + MARK_START.length);
	const after = oldDoc.slice(oldDoc.indexOf(MARK_END));

	const suites = await collectSuites();
	const suitesList = toSuitesList(suites);

	const newDoc = [before, suitesList, after].join('\n');

	writeFileSync(filePath, newDoc);
}

void documentSuites();
