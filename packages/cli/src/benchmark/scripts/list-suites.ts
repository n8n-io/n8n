import fs from 'node:fs/promises';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { collectSuites } from '../lib';
import type { Suites } from '../lib';

async function exists(filePath: string) {
	const fullPath = path.resolve('src', 'benchmark', filePath);

	try {
		await fs.access(fullPath);
		return true;
	} catch {
		return false;
	}
}

async function toSuitesList(suites: Suites) {
	let list = '';

	for (const [fullPath, suite] of Object.entries(suites)) {
		const suiteId = fullPath.split('/').pop()?.split('-').shift() ?? '';

		list += `\n### ${suiteId} - ${suite.name}\n\n`;

		for (let i = 0; i < suite.tasks.length; i++) {
			const suiteName = suite.tasks[i].name.replace(suite.name, '').trim();
			const workflowPath = `./suites/workflows/${suiteId}-${i + 1}.json`;

			list += (await exists(workflowPath))
				? `- [${suiteName}](${workflowPath})\n`
				: `- ${suiteName}\n`;
		}
	}

	return list;
}

/**
 * Insert an auto-generated list of benchmarking suites into `benchmark.md`.
 */
async function listSuites() {
	const filePath = path.resolve('src', 'benchmark', 'benchmark.md');
	const oldDoc = await fs.readFile(filePath, 'utf8');

	const MARK_START = '<!-- BENCHMARK_SUITES_LIST -->';
	const MARK_END = '<!-- /BENCHMARK_SUITES_LIST -->';

	const before = oldDoc.slice(0, oldDoc.indexOf(MARK_START) + MARK_START.length);
	const after = oldDoc.slice(oldDoc.indexOf(MARK_END));

	const suites = await collectSuites();
	const suitesList = await toSuitesList(suites);

	const newDoc = [before, suitesList, after].join('\n');

	writeFileSync(filePath, newDoc);
}

void listSuites();
