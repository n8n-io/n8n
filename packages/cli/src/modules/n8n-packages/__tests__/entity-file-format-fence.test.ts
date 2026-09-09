import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const MODULE_DIR = path.resolve(__dirname, '..');
const IO_DIR = path.join(MODULE_DIR, 'io');
const INLINE_TAB_STRINGIFY = /JSON\.stringify\([^)]*["']\\t["']/;

describe('entity file format fence', () => {
	it('has no tab-indented JSON.stringify outside io/, so formatEntityFile stays the only formatter', () => {
		const offenders = readdirSync(MODULE_DIR, { withFileTypes: true, recursive: true })
			.filter(
				(entry) =>
					entry.isFile() &&
					entry.name.endsWith('.ts') &&
					!entry.name.endsWith('.test.ts') &&
					!entry.parentPath.includes('__tests__') &&
					!entry.parentPath.startsWith(IO_DIR),
			)
			.map((entry) => path.join(entry.parentPath, entry.name))
			.filter((file) => INLINE_TAB_STRINGIFY.test(readFileSync(file, 'utf8')))
			.map((file) => path.relative(MODULE_DIR, file));

		expect(offenders).toEqual([]);
	});
});
