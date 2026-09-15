import { afterEach, vi } from 'vitest';

import { N8nClient } from '../clients/n8n-client';

/**
 * `deleteWorkflow` archives before it deletes, and both steps have a failure
 * that means the work is already done. Cleanup and eviction both re-delete ids
 * an earlier pass took, so treating those as errors leaked every seeded folder
 * behind them.
 */

/** Answers each request by URL match. Anything unmatched returns 200. */
function mockFetch(statusFor: (url: string) => number) {
	const fn = vi.fn((url: string | URL, _init?: RequestInit) => {
		const status = statusFor(String(url));
		return {
			ok: status < 400,
			status,
			headers: { get: () => null },
			json: () => ({}),
			text: () => `HTTP ${String(status)}`,
		};
	});
	vi.stubGlobal('fetch', fn);
	return fn;
}

afterEach(() => vi.unstubAllGlobals());

function calledPaths(fn: ReturnType<typeof mockFetch>): string[] {
	return fn.mock.calls.map(([url]) => String(url).replace('http://n8n.test', ''));
}

describe('N8nClient.deleteWorkflow', () => {
	it('deletes after archiving', async () => {
		const fetchMock = mockFetch(() => 200);

		await new N8nClient('http://n8n.test').deleteWorkflow('wf-1');

		expect(calledPaths(fetchMock)).toEqual([
			'/rest/workflows/wf-1/archive',
			'/rest/workflows/wf-1',
		]);
	});

	it('still deletes when the archive reports the workflow is already archived', async () => {
		// A folder delete archives what the folder held, so the 400 here is expected.
		const fetchMock = mockFetch((url) => (url.endsWith('/archive') ? 400 : 200));

		await new N8nClient('http://n8n.test').deleteWorkflow('wf-1');

		expect(calledPaths(fetchMock)).toContain('/rest/workflows/wf-1');
	});

	// 403 is what a globally scoped user gets for a workflow that no longer
	// exists: the scope middleware passes and the controller reports the missing
	// row as forbidden. A member gets 404. Both mean gone.
	it.each([403, 404])('treats an archive that reports %i as already gone', async (status) => {
		const fetchMock = mockFetch((url) => (url.endsWith('/archive') ? status : 200));

		await expect(new N8nClient('http://n8n.test').deleteWorkflow('wf-1')).resolves.toBeUndefined();

		// No point deleting a workflow that is not there.
		expect(calledPaths(fetchMock)).toEqual(['/rest/workflows/wf-1/archive']);
	});

	it.each([403, 404])('treats a delete that reports %i as already gone', async (status) => {
		const fetchMock = mockFetch((url) => (url.endsWith('/archive') ? 200 : status));

		await expect(new N8nClient('http://n8n.test').deleteWorkflow('wf-1')).resolves.toBeUndefined();

		expect(calledPaths(fetchMock)).toEqual([
			'/rest/workflows/wf-1/archive',
			'/rest/workflows/wf-1',
		]);
	});

	it.each([
		['archive', (url: string) => (url.endsWith('/archive') ? 502 : 200)],
		['delete', (url: string) => (url.endsWith('/archive') ? 200 : 502)],
	])('still throws when the %s fails for a real reason', async (_step, statusFor) => {
		mockFetch(statusFor);

		await expect(new N8nClient('http://n8n.test').deleteWorkflow('wf-1')).rejects.toThrow('502');
	});
});
