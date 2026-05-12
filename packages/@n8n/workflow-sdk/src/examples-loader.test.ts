import { getExampleFiles, resetExampleFilesCache } from './examples-loader';

describe('examples-loader', () => {
	beforeEach(() => resetExampleFilesCache());

	it('loads manifest entries when present', () => {
		const bundle = getExampleFiles();
		// In CI without a manifest, both arrays will be empty — that's also valid.
		// When a manifest exists (post `pnpm regenerate-examples`), assert structure.
		if (bundle.files.length === 0) {
			expect(bundle.indexTxt).toBe('');
			return;
		}

		// Each generated file has the expected shape
		for (const file of bundle.files) {
			expect(file.filename).toMatch(/\.ts$/);
			expect(file.content).toContain('@template');
			expect(file.content).toContain("from '@n8n/workflow-sdk'");
			expect(file.content).toContain('export default');
			// Untrusted catalog description must not be embedded in JSDoc.
			expect(file.content).not.toContain('@description');
		}

		// Index lines match the file count
		const indexLines = bundle.indexTxt.trim().split('\n');
		expect(indexLines.length).toBe(bundle.files.length);

		// Each index line has the documented 5-field shape
		for (const line of indexLines) {
			const parts = line.split(' | ');
			expect(parts.length).toBe(5);
			expect(parts[0]).toMatch(/\.ts$/);
			expect(parts[4]).toMatch(/^n8n:\d+/);
		}
	});

	it('memoises across calls', () => {
		const a = getExampleFiles();
		const b = getExampleFiles();
		expect(a).toBe(b);
	});

	it('resetExampleFilesCache forces a reload', () => {
		const a = getExampleFiles();
		resetExampleFilesCache();
		const b = getExampleFiles();
		expect(a).not.toBe(b);
	});
});
