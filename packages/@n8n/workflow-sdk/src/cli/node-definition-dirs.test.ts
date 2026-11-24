import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NODE_DEFINITION_DIRS_ENV_VAR, resolveNodeDefinitionDirs } from './node-definition-dirs';

let tmpRoot: string;

/** A dir only counts as a node-definition dir if it holds a `nodes/` tree. */
function makeDefinitionDir(name: string): string {
	const dir = path.join(tmpRoot, name);
	fs.mkdirSync(path.join(dir, 'nodes'), { recursive: true });
	return dir;
}

beforeEach(() => {
	tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'node-def-dirs-'));
	delete process.env[NODE_DEFINITION_DIRS_ENV_VAR];
});

afterEach(() => {
	fs.rmSync(tmpRoot, { recursive: true, force: true });
	delete process.env[NODE_DEFINITION_DIRS_ENV_VAR];
});

describe('resolveNodeDefinitionDirs', () => {
	it('accepts explicit dirs', () => {
		const first = makeDefinitionDir('base');
		const second = makeDefinitionDir('langchain');

		expect(
			resolveNodeDefinitionDirs({
				explicit: [first, second],
				workflowDir: tmpRoot,
			}),
		).toEqual([first, second]);
	});

	it('drops paths that are missing or lack a nodes/ tree', () => {
		const valid = makeDefinitionDir('base');
		const empty = path.join(tmpRoot, 'empty');
		fs.mkdirSync(empty);

		expect(
			resolveNodeDefinitionDirs({
				explicit: [valid, empty, path.join(tmpRoot, 'does-not-exist')],
				workflowDir: tmpRoot,
			}),
		).toEqual([valid]);
	});

	it('reads the env var as a delimiter-separated list', () => {
		const first = makeDefinitionDir('base');
		const second = makeDefinitionDir('langchain');
		process.env[NODE_DEFINITION_DIRS_ENV_VAR] = [first, second].join(path.delimiter);

		expect(resolveNodeDefinitionDirs({ workflowDir: tmpRoot })).toEqual([first, second]);
	});

	it('prefers explicit dirs over the env var', () => {
		const fromFlag = makeDefinitionDir('flag');
		process.env[NODE_DEFINITION_DIRS_ENV_VAR] = makeDefinitionDir('env');

		expect(
			resolveNodeDefinitionDirs({
				explicit: [fromFlag],
				workflowDir: tmpRoot,
			}),
		).toEqual([fromFlag]);
	});

	it('returns no dirs when the builtin node packages are not resolvable', () => {
		expect(resolveNodeDefinitionDirs({ workflowDir: tmpRoot, cwd: tmpRoot })).toEqual([]);
	});
});
