import { describe, expect, it } from 'vitest';

import { loadAppHtml } from './resource-loader';

describe('loadAppHtml', () => {
	it('rejects unknown filenames before touching the filesystem', async () => {
		await expect(
			// Cast through `unknown` since the type union normally guards this at
			// compile time; the runtime check is the defense for callers that
			// bypass typing (e.g. JS callers or runtime-built strings).
			loadAppHtml('../../../etc/passwd' as unknown as 'workflow-preview.html'),
		).rejects.toThrow(/Unknown MCP app HTML file/);
	});

	it('rejects empty filename', async () => {
		await expect(loadAppHtml('' as unknown as 'workflow-preview.html')).rejects.toThrow(
			/Unknown MCP app HTML file/,
		);
	});

	it('rejects path-like filenames that bypass the union', async () => {
		await expect(
			loadAppHtml('dist/apps/workflow-preview.html' as unknown as 'workflow-preview.html'),
		).rejects.toThrow(/Unknown MCP app HTML file/);
	});
});
