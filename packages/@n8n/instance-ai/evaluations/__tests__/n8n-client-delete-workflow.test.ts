import { afterEach, vi } from 'vitest';

import { N8nClient } from '../clients/n8n-client';

/**
 * `deleteWorkflow` archives before it deletes, and both steps have a failure
 * that means the work is already done. Cleanup and eviction both re-delete ids
 * an earlier pass took, so treating those as errors leaked every seeded folder
 * behind them. Which status says "already gone" depends on the user, so these
 * cover the owner and the member separately.
 */

/** Answers each request by URL match. Anything unmatched returns 200. */
function mockFetch(statusFor: (url: string) => number, loginBody: unknown = {}) {
	const fn = vi.fn((url: string | URL, _init?: RequestInit) => {
		const path = String(url);
		const status = path.endsWith('/rest/login') ? 200 : statusFor(path);
		return {
			ok: status < 400,
			status,
			// The client reads `set-cookie` off every response to capture the login cookie.
			headers: { get: () => (path.endsWith('/rest/login') ? 'n8n-auth=tok' : null) },
			json: () => (path.endsWith('/rest/login') ? loginBody : {}),
			text: () => `HTTP ${String(status)}`,
		};
	});
	vi.stubGlobal('fetch', fn);
	return fn;
}

afterEach(() => vi.unstubAllGlobals());

function calledPaths(fn: ReturnType<typeof mockFetch>): string[] {
	return fn.mock.calls
		.map(([url]) => String(url).replace('http://n8n.test', ''))
		.filter((path) => path !== '/rest/login');
}

/** Logged in as the eval owner, who holds `workflow:delete` globally. */
async function ownerClient(statusFor: (url: string) => number) {
	const fetchMock = mockFetch(statusFor, {
		data: { globalScopes: ['workflow:delete'], isOwner: true },
	});
	const client = new N8nClient('http://n8n.test');
	await client.login();
	return { client, fetchMock };
}

/** Logged in as an invited member, who holds no global scope. */
async function memberClient(statusFor: (url: string) => number) {
	const fetchMock = mockFetch(statusFor, { data: { globalScopes: [], isOwner: false } });
	const client = new N8nClient('http://n8n.test');
	await client.login();
	return { client, fetchMock };
}

const onArchive = (status: number) => (url: string) => (url.endsWith('/archive') ? status : 200);
const onDelete = (status: number) => (url: string) => (url.endsWith('/archive') ? 200 : status);

describe('N8nClient.deleteWorkflow', () => {
	it('deletes after archiving', async () => {
		const { client, fetchMock } = await ownerClient(() => 200);

		await client.deleteWorkflow('wf-1');

		expect(calledPaths(fetchMock)).toEqual([
			'/rest/workflows/wf-1/archive',
			'/rest/workflows/wf-1',
		]);
	});

	it('still deletes when the archive reports the workflow is already archived', async () => {
		// A folder delete archives what the folder held, so the 400 here is expected.
		const { client, fetchMock } = await ownerClient(onArchive(400));

		await client.deleteWorkflow('wf-1');

		expect(calledPaths(fetchMock)).toContain('/rest/workflows/wf-1');
	});

	// The owner passes the scope middleware on the global check alone, so the
	// controller reports a missing workflow as forbidden rather than not-found.
	it('treats an archive that reports 403 as already gone, for the owner', async () => {
		const { client, fetchMock } = await ownerClient(onArchive(403));

		await expect(client.deleteWorkflow('wf-1')).resolves.toBeUndefined();

		// No point deleting a workflow that is not there.
		expect(calledPaths(fetchMock)).toEqual(['/rest/workflows/wf-1/archive']);
	});

	it('treats a delete that reports 403 as already gone, for the owner', async () => {
		const { client, fetchMock } = await ownerClient(onDelete(403));

		await expect(client.deleteWorkflow('wf-1')).resolves.toBeUndefined();

		expect(calledPaths(fetchMock)).toEqual([
			'/rest/workflows/wf-1/archive',
			'/rest/workflows/wf-1',
		]);
	});

	// A member reaches the middleware's own lookup, which 404s on a missing row.
	it.each([
		['archive', onArchive(404)],
		['delete', onDelete(404)],
	])('treats a %s that reports 404 as already gone, for a member', async (_step, statusFor) => {
		const { client } = await memberClient(statusFor);

		await expect(client.deleteWorkflow('wf-1')).resolves.toBeUndefined();
	});

	// For a member, 403 is a real permission failure on a workflow that EXISTS.
	// Swallowing it would report the cleanup clean and leave the workflow behind.
	it.each([
		['archive', onArchive(403)],
		['delete', onDelete(403)],
	])('still throws when a %s reports 403 for a member', async (_step, statusFor) => {
		const { client } = await memberClient(statusFor);

		await expect(client.deleteWorkflow('wf-1')).rejects.toThrow('403');
	});

	it('takes the strict path when the client never logged in', async () => {
		mockFetch(onArchive(403));

		await expect(new N8nClient('http://n8n.test').deleteWorkflow('wf-1')).rejects.toThrow('403');
	});

	it.each([
		['archive', onArchive(502)],
		['delete', onDelete(502)],
	])('still throws when the %s fails for a real reason', async (_step, statusFor) => {
		const { client } = await ownerClient(statusFor);

		await expect(client.deleteWorkflow('wf-1')).rejects.toThrow('502');
	});
});
