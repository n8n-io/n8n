import { readFileSync } from 'fs';
import { basename } from 'path';

import { getJsonFiles } from './get-json-files';
import { EvalTestCaseSchema } from '../harness/schema';
import type { WorkflowTestCase } from '../types';

export interface WorkflowTestCaseWithFile {
	testCase: WorkflowTestCase;
	/** Filename without extension, e.g. "contact-form-automation" */
	fileSlug: string;
}

export interface LoadEvalCasesOptions {
	/** Parse only these file slugs; other files in the directory are never read. */
	slugs?: ReadonlySet<string>;
	/** Report an invalid file and skip it instead of throwing. */
	onInvalid?: (filePath: string, error: Error) => void;
}

function parseTestCaseFile(filePath: string): WorkflowTestCase {
	const content = readFileSync(filePath, 'utf-8');

	let raw: unknown;
	try {
		raw = JSON.parse(content);
	} catch (error) {
		throw new Error(
			`Failed to parse test case ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	const parsed = EvalTestCaseSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
			.join('\n');
		throw new Error(`Invalid test case ${filePath}:\n${issues}`);
	}

	return parsed.data;
}

/** Load test cases with their file slugs (for LangSmith dataset sync derived IDs). */
export function loadEvalCasesFromDir(
	dataDir: string,
	filter?: string,
	exclude?: string,
	transform?: (testCase: WorkflowTestCase) => WorkflowTestCase,
	options: LoadEvalCasesOptions = {},
): WorkflowTestCaseWithFile[] {
	const { slugs, onInvalid } = options;
	const files = getJsonFiles(dataDir, filter, exclude).filter(
		(f) => slugs === undefined || slugs.has(basename(f, '.json')),
	);
	const loaded: WorkflowTestCaseWithFile[] = [];
	for (const f of files) {
		let testCase: WorkflowTestCase;
		try {
			testCase = parseTestCaseFile(f);
		} catch (error) {
			if (!onInvalid) throw error;
			onInvalid(f, error instanceof Error ? error : new Error(String(error)));
			continue;
		}
		loaded.push({
			testCase: transform ? transform(testCase) : testCase,
			fileSlug: basename(f, '.json'),
		});
	}
	return loaded;
}
