/* eslint-env mocha */
'use strict';

const madge = require('../lib/api');
const ts = require('typescript');
require('should');

describe('TypeScript', () => {
	const dir = __dirname + '/typescript';

	it('extracts module dependencies', (done) => {
		madge(dir + '/import.ts').then((res) => {
			res.obj().should.eql({
				'import.ts': ['require-x.tsx', 'require.ts'],
				'require.ts': ['export.ts'],
				'require-x.tsx': ['export-x.tsx', 'export.ts'],
				'export.ts': [],
				'export-x.tsx': []
			});
			done();
		}).catch(done);
	});

	it('reads paths from a custom tsConfig', (done) => {
		const tsConfig = {
			compilerOptions: {
				baseUrl: dir,
				moduleResolution: 'node',
				paths: {
					'@shortcut/*': ['custom-paths/subfolder/*'],
					'@shortcut2/*': ['custom-paths/subfolder2/*']
				}
			}
		};
		madge(dir + '/custom-paths/import.ts', {tsConfig: tsConfig}).then((res) => {
			res.obj().should.eql({
				'import.ts': ['subfolder/index.ts', 'subfolder/require.tsx'],
				'subfolder/index.ts': [],
				'subfolder/require.tsx': ['subfolder2/export.ts'],
				'subfolder2/export.ts': []
			});
			done();
		}).catch(done);
	});

	it('got tsConfig as a string, "extends" field is interpreted', (done) => {
		madge(dir + '/custom-paths/import.ts', {tsConfig: dir + '/with-config/tsconfig.json'}).then((res) => {
			res.config.tsConfig.should.eql({
				extends: './tsconfig.base.json',
				compilerOptions: {
					target: ts.ScriptTarget.ESNext,
					module: ts.ModuleKind.CommonJS,
					allowJs: true,
					configFilePath: undefined
				}
			});
			done();
		}).catch(done);
	});

	it('supports CJS modules when using mixedImports option', (done) => {
		madge(dir + '/mixed.ts', {detectiveOptions: {ts: {mixedImports: true}}}).then((res) => {
			res.obj().should.eql({
				'export-x.tsx': [],
				'export.ts': [],
				'mixed.ts': ['export-x.tsx', 'export.ts']
			});
			done();
		}).catch(done);
	});
});
