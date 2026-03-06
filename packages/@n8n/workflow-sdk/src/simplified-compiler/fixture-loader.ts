import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { Expectations } from './expectation-matcher';

export interface Fixture {
	dir: string;
	title: string;
	input: string;
	expectedOutput: string;
	skip?: string;
	hasNock: boolean;
	hasExpectations: boolean;
	expectations?: Expectations;
}

interface FixtureMeta {
	title: string;
	skip?: string;
}

function loadFixtureFromDir(dirPath: string, dirName: string): Fixture {
	const meta = JSON.parse(readFileSync(join(dirPath, 'meta.json'), 'utf-8')) as FixtureMeta;
	const input = readFileSync(join(dirPath, 'input.js'), 'utf-8').trim();
	const expectedOutput = readFileSync(join(dirPath, 'output.js'), 'utf-8').trim();
	const hasNock = existsSync(join(dirPath, 'nock.ts'));
	const expectationsPath = join(dirPath, 'expectations.json');
	const hasExpectations = existsSync(expectationsPath);
	const expectations = hasExpectations
		? (JSON.parse(readFileSync(expectationsPath, 'utf-8')) as Expectations)
		: undefined;

	return {
		dir: dirName,
		title: meta.title,
		input,
		expectedOutput,
		skip: meta.skip,
		hasNock,
		hasExpectations,
		expectations,
	};
}

export function loadFixtures(): Fixture[] {
	const dir = join(__dirname, '__fixtures__');
	return readdirSync(dir)
		.filter((f) => statSync(join(dir, f)).isDirectory())
		.sort()
		.map((f) => loadFixtureFromDir(join(dir, f), f));
}
