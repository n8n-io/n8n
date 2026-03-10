import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

export interface Fixture {
	dir: string;
	title: string;
	/** Data-flow code (the primary input — what the LLM writes) */
	input: string;
	/** Original WorkflowJSON for reference comparison (optional) */
	referenceJson?: string;
	skip?: string;
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
			return { dir: dirName, title: meta.title, input: '', skip: meta.skip };
		}
		throw new Error(`No input.ts found for fixture at ${dirPath}`);
	}
	const input = readFileSync(inputPath, 'utf-8').trim();

	// Load reference JSON if present (for comparison)
	const jsonPath = join(dirPath, 'input.json');
	const referenceJson = existsSync(jsonPath) ? readFileSync(jsonPath, 'utf-8').trim() : undefined;

	return {
		dir: dirName,
		title: meta.title,
		input,
		referenceJson,
		skip: meta.skip,
	};
}

export function loadFixtures(): Fixture[] {
	return readdirSync(FIXTURES_DIR)
		.filter((f) => statSync(join(FIXTURES_DIR, f)).isDirectory())
		.sort()
		.map((f) => loadFixtureFromDir(join(FIXTURES_DIR, f), f));
}
