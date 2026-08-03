import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CheckResult } from './types.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function getDefaultEvidenceDir(): string {
	return join(packageRoot, 'evidence');
}

function formatPathBullets(paths: string[]): string[] {
	if (paths.length === 0) {
		return ['- none'];
	}
	return paths.map((path) => `- ${path}`);
}

export function formatEvidenceMarkdown(result: CheckResult): string {
	const lines = [
		`# Evidence: ${result.ticketId}`,
		'',
		`- **Approved:** ${result.approved ? 'yes' : 'no'}`,
		`- **Area restricted:** ${result.areaRestricted ? 'yes' : 'no'}`,
		`- **Result:** ${result.status}`,
		'',
		'## Required tests',
		'',
	];

	if (result.requiredTests.length === 0) {
		lines.push('- none');
	} else {
		for (const test of result.requiredTests) {
			lines.push(`- ${test}`);
		}
	}

	lines.push(
		'',
		'## Approved boundaries',
		'',
		'### Read',
		...formatPathBullets(result.allowedReadPaths),
		'',
		'### Write',
		...formatPathBullets(result.allowedWritePaths),
	);

	if (result.blockReasons.length > 0) {
		lines.push('', '## Block reasons', '');
		for (const reason of result.blockReasons) {
			lines.push(`- ${reason}`);
		}
	}

	lines.push('');
	return lines.join('\n');
}

/**
 * Writes `evidence/<ticketId>.md` and returns the absolute path written.
 */
export function writeEvidenceReport(result: CheckResult, evidenceDir?: string): string {
	const dir = evidenceDir ?? getDefaultEvidenceDir();
	mkdirSync(dir, { recursive: true });

	const filePath = join(dir, `${result.ticketId}.md`);
	writeFileSync(filePath, formatEvidenceMarkdown(result), 'utf8');
	return resolve(filePath);
}
