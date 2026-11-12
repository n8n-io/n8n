import {
	countSkippedFiles,
	isScriptFile,
	MAX_REPORTED_EXTENSIONS,
	NO_EXTENSION,
	OTHER_EXTENSION,
} from '../utils/skipped-files';

describe('isScriptFile', () => {
	it.each([
		['scripts/run.sh', true],
		['tools/build.PY', true],
		['src/index.ts', true],
		['assets/logo.png', false],
		['notes.txt', false],
		['LICENSE', false],
	])('says whether %s is a script', (path, expected) => {
		expect(isScriptFile(path)).toBe(expected);
	});
});

describe('countSkippedFiles', () => {
	it('gives no extensions and no scripts for no files', () => {
		expect(countSkippedFiles([])).toEqual({ extensions: {}, scripts: 0 });
	});

	it('counts each extension in lowercase and counts the scripts', () => {
		expect(
			countSkippedFiles([
				'scripts/a.py',
				'scripts/b.PY',
				'scripts/c.Py',
				'scripts/run.sh',
				'assets/logo.png',
				'assets/icon.PNG',
				'notes.txt',
			]),
		).toEqual({
			extensions: { '.py': 3, '.png': 2, '.sh': 1, '.txt': 1 },
			scripts: 4,
		});
	});

	it.each([
		['LICENSE', NO_EXTENSION],
		['.env', NO_EXTENSION],
		['dir.v2/Makefile', NO_EXTENSION],
		['name.', NO_EXTENSION],
		['archive.tar.gz', '.gz'],
		['lib/a.c++', OTHER_EXTENSION],
		['notes.customer-name', OTHER_EXTENSION],
		['data.abcdefghijk', OTHER_EXTENSION],
		['brief.acmecorp', OTHER_EXTENSION],
		['report.Q3', OTHER_EXTENSION],
		['prod.ENV', '.env'],
		['guide.MD', '.md'],
	])('puts %s in the %s bucket', (path, key) => {
		expect(countSkippedFiles([path]).extensions).toEqual({ [key]: 1 });
	});

	it('names only the most common extensions and puts the rest in other', () => {
		// Known extensions that each occur once. Two of them miss the cap.
		const rare = [
			'yaml',
			'toml',
			'xml',
			'csv',
			'tsv',
			'ini',
			'png',
			'jpg',
			'gif',
			'svg',
			'pdf',
			'zip',
			'txt',
			'html',
			'css',
			'sql',
			'py',
			'sh',
			'js',
			'ts',
		].map((extension) => `f.${extension}`);
		const common = ['a.md', 'b.md', 'c.json', 'd.json', 'e.$$$'];

		const { extensions } = countSkippedFiles([...rare, ...common]);

		expect(Object.keys(extensions)).toHaveLength(MAX_REPORTED_EXTENSIONS + 1);
		expect(extensions['.md']).toBe(2);
		expect(extensions['.json']).toBe(2);
		// Two rare extensions miss the cap, and the unknown one is always `other`.
		expect(extensions[OTHER_EXTENSION]).toBe(3);
		expect(Object.values(extensions).reduce((sum, count) => sum + count, 0)).toBe(
			rare.length + common.length,
		);
	});

	it('never reports a file name or a path', () => {
		const { extensions } = countSkippedFiles([
			'secret-plan/acme-contract.pdf',
			'acme',
			'notes/brief.acmecorp',
		]);

		expect(JSON.stringify(extensions)).not.toMatch(/acme|secret|contract|brief/);
		expect(extensions).toEqual({ '.pdf': 1, none: 1, other: 1 });
	});
});
