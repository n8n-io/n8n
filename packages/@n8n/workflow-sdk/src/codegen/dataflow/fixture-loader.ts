import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Expectations } from './expectation-matcher';

export interface Fixture {
	dir: string;
	title: string;
	/** Data-flow code (the primary input — what the LLM writes) */
	input: string;
	/** Original WorkflowJSON for reference comparison (optional) */
	referenceJson?: string;
	skip?: string;
	/** Whether this fixture has a nock.ts file for HTTP mocking */
	hasNock: boolean;
	/** Whether this fixture has expectations.json */
	hasExpectations: boolean;
	/** Loaded expectations (if present) */
	expectations?: Expectations;
	/** Whether this fixture has pin-data.json */
	hasPinData: boolean;
	/** Loaded pin data (if present) */
	pinData?: Record<string, unknown[]>;
}

interface FixtureMeta {
	title: string;
	skip?: string;
}

const FIXTURES_DIR = join(__dirname, '__fixtures__');

function loadFixtureFromDir(dirPath: string, dirName: string): Fixture {
	const meta = JSON.parse(readFileSync(join(dirPath, 'meta.json'), 'utf-8')) as FixtureMeta;

	const inputPath = join(dirPath, 'input.ts');
	if (!existsSync(inputPath)) {
		if (meta.skip) {
			return {
				dir: dirName,
				title: meta.title,
				input: '',
				skip: meta.skip,
				hasNock: false,
				hasExpectations: false,
				hasPinData: false,
			};
		}
		throw new Error(`No input.ts found for fixture at ${dirPath}`);
	}
	const input = readFileSync(inputPath, 'utf-8').trim();

	// Load reference JSON if present (for comparison)
	const jsonPath = join(dirPath, 'input.json');
	const referenceJson = existsSync(jsonPath) ? readFileSync(jsonPath, 'utf-8').trim() : undefined;

	// Load execution test files
	const hasNock = existsSync(join(dirPath, 'nock.ts'));

	const expectationsPath = join(dirPath, 'expectations.json');
	const hasExpectations = existsSync(expectationsPath);
	const expectations = hasExpectations
		? (JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectations)
		: undefined;

	const pinDataPath = join(dirPath, 'pin-data.json');
	const hasPinData = existsSync(pinDataPath);
	const pinData = hasPinData
		? (JSON.parse(readFileSync(pinDataPath, 'utf-8')) as Record<string, unknown[]>)
		: undefined;

	return {
		dir: dirName,
		title: meta.title,
		input,
		referenceJson,
		skip: meta.skip,
		hasNock,
		hasExpectations,
		expectations,
		hasPinData,
		pinData,
	};
}

export function loadFixtures(): Fixture[] {
	return readdirSync(FIXTURES_DIR)
		.filter((f) => statSync(join(FIXTURES_DIR, f)).isDirectory())
		.sort()
		.map((f) => loadFixtureFromDir(join(FIXTURES_DIR, f), f));
}
