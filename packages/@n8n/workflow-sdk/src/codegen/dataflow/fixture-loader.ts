import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import type { WorkflowJSON } from '../../types/base';

export interface Fixture {
	dir: string;
	title: string;
	input: WorkflowJSON;
	skip?: string;
}

interface FixtureMeta {
	title: string;
	skip?: string;
	/** Path to a template file (relative to the templates/utils/samples dir) */
	templateFile?: string;
}

const FIXTURES_DIR = join(__dirname, '__fixtures__');
const TEMPLATES_DIR = resolve(
	__dirname,
	'../../../../../frontend/editor-ui/src/features/workflows/templates/utils/samples',
);

function loadWorkflowInput(dirPath: string, meta: FixtureMeta): WorkflowJSON {
	// If templateFile is specified, load from template samples
	if (meta.templateFile) {
		const templatePath = join(TEMPLATES_DIR, meta.templateFile);
		return JSON.parse(readFileSync(templatePath, 'utf-8')) as WorkflowJSON;
	}

	// Otherwise load input.json from the fixture dir
	const inputPath = join(dirPath, 'input.json');
	if (!existsSync(inputPath)) {
		throw new Error(`No input.json or templateFile found for fixture at ${dirPath}`);
	}
	return JSON.parse(readFileSync(inputPath, 'utf-8')) as WorkflowJSON;
}

function loadFixtureFromDir(dirPath: string, dirName: string): Fixture {
	const meta = JSON.parse(readFileSync(join(dirPath, 'meta.json'), 'utf-8')) as FixtureMeta;
	const input = loadWorkflowInput(dirPath, meta);

	return {
		dir: dirName,
		title: meta.title,
		input,
		skip: meta.skip,
	};
}

export function loadFixtures(): Fixture[] {
	return readdirSync(FIXTURES_DIR)
		.filter((f) => statSync(join(FIXTURES_DIR, f)).isDirectory())
		.sort()
		.map((f) => loadFixtureFromDir(join(FIXTURES_DIR, f), f));
}
