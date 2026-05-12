import { readFileSync, readdirSync } from 'fs';
import { basename, join } from 'path';

import type { DiscoveryTestCase } from '../../discovery/types';

export interface DiscoveryTestCaseWithFile {
	testCase: DiscoveryTestCase;
	/** Filename without extension, e.g. "slack-oauth-credential-setup" */
	fileSlug: string;
}

function parseTestCaseFile(filePath: string): DiscoveryTestCase {
	const content = readFileSync(filePath, 'utf-8');
	try {
		return JSON.parse(content) as DiscoveryTestCase;
	} catch (error) {
		throw new Error(
			`Failed to parse discovery test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function parseSubstringList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s) => s.length > 0);
}

function getJsonFiles(filter?: string, exclude?: string): string[] {
	const dir = __dirname;
	let files = readdirSync(dir).filter((f) => f.endsWith('.json'));

	const includeTokens = parseSubstringList(filter);
	if (includeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = f.toLowerCase();
			return includeTokens.some((t) => lower.includes(t));
		});
	}

	const excludeTokens = parseSubstringList(exclude);
	if (excludeTokens.length > 0) {
		files = files.filter((f) => {
			const lower = f.toLowerCase();
			return !excludeTokens.some((t) => lower.includes(t));
		});
	}

	return files.map((f) => join(dir, f));
}

export function loadDiscoveryTestCasesWithFiles(
	filter?: string,
	exclude?: string,
): DiscoveryTestCaseWithFile[] {
	return getJsonFiles(filter, exclude).map((f) => ({
		testCase: parseTestCaseFile(f),
		fileSlug: basename(f, '.json'),
	}));
}
