import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import * as path from 'path';

interface WorkflowSdkPackageJson {
	exports: Record<string, string | Record<string, string>>;
	files: string[];
}

function loadPackageJson(): WorkflowSdkPackageJson {
	const raw = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8');
	return jsonParse<WorkflowSdkPackageJson>(raw);
}

function collectExportPaths(exports: WorkflowSdkPackageJson['exports']): string[] {
	const paths: string[] = [];
	for (const value of Object.values(exports)) {
		if (typeof value === 'string') {
			paths.push(value);
		} else {
			paths.push(...Object.values(value));
		}
	}
	return paths;
}

// `files` only lists simple `<dir>/**/*` globs today; matching on the directory
// prefix is enough without pulling in a glob-matching dependency.
function isPublished(exportPath: string, files: string[]): boolean {
	const relative = exportPath.replace(/^\.\//, '');
	return files.some((pattern) => relative.startsWith(pattern.replace(/\*\*\/\*$/, '')));
}

describe('package.json exports', () => {
	it('every exported subpath resolves to a file included in the published "files" field', () => {
		const pkg = loadPackageJson();

		const unpublishedExports = collectExportPaths(pkg.exports).filter(
			(exportPath) => exportPath !== './package.json' && !isPublished(exportPath, pkg.files),
		);

		// Regression test for https://github.com/n8n-io/n8n/issues/31980:
		// an export pointing at a `src/**` file resolves locally in this monorepo,
		// but 404s for consumers of the published npm package since only `files`
		// gets shipped.
		expect(unpublishedExports).toEqual([]);
	});
});
