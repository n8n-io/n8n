import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import {
	fetchLinkedInstances,
	linkInstance,
	unlinkInstance,
	updateLinkedInstance,
	verifyLinkedInstance,
} from '../linkedInstances.api';
import { fakeToken, linkedInstance } from './linkedInstances.fixtures';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = { baseUrl: '/rest', pushRef: 'push-1' } as IRestApiContext;

describe('linkedInstances.api', () => {
	beforeEach(() => {
		vi.mocked(makeRestApiRequest).mockReset();
	});

	describe('fetchLinkedInstances', () => {
		it('reads the list of links', async () => {
			const rows = [linkedInstance(), linkedInstance({ id: 'link-2', name: 'Staging' })];
			vi.mocked(makeRestApiRequest).mockResolvedValue(rows);

			await expect(fetchLinkedInstances(context)).resolves.toEqual(rows);
			expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/linked-instances');
		});

		it('reads a status that this client does not know as "unknown"', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue([{ ...linkedInstance(), status: 'paused' }]);

			const [row] = await fetchLinkedInstances(context);

			expect(row.status).toBe('unknown');
		});

		it('keeps a missing default project as null', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue([
				linkedInstance({ defaultRemoteProject: null, lastVerifiedAt: null }),
			]);

			const [row] = await fetchLinkedInstances(context);

			expect(row.defaultRemoteProject).toBeNull();
			expect(row.lastVerifiedAt).toBeNull();
		});

		it('drops fields that the summary does not name', async () => {
			const extra = fakeToken();
			vi.mocked(makeRestApiRequest).mockResolvedValue([{ ...linkedInstance(), token: extra }]);

			const [row] = await fetchLinkedInstances(context);

			expect(row).toEqual(linkedInstance());
			expect(JSON.stringify(row)).not.toContain(extra);
		});

		it.each([
			['not a list', { data: [] }],
			['a row without an id', [{ ...linkedInstance(), id: '' }]],
			['a row without a name', [{ ...linkedInstance(), name: undefined }]],
		])('rejects a response that is %s', async (_label, response) => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(response);

			await expect(fetchLinkedInstances(context)).rejects.toThrow();
		});
	});

	it('links an instance with the name, the address and the token', async () => {
		const token = fakeToken();
		vi.mocked(makeRestApiRequest).mockResolvedValue(linkedInstance());

		await expect(
			linkInstance(context, { name: 'Acme Cloud', url: 'acme.app.n8n.cloud', token }),
		).resolves.toEqual(linkedInstance());
		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'POST', '/linked-instances', {
			name: 'Acme Cloud',
			url: 'acme.app.n8n.cloud',
			token,
		});
	});

	it('checks one link again', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue(linkedInstance({ status: 'offline' }));

		const summary = await verifyLinkedInstance(context, 'link-1');

		expect(summary.status).toBe('offline');
		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/linked-instances/link-1/verify',
		);
	});

	it('sends a new token for one link', async () => {
		const token = fakeToken();
		vi.mocked(makeRestApiRequest).mockResolvedValue(linkedInstance());

		await updateLinkedInstance(context, 'link-1', { token });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PATCH', '/linked-instances/link-1', {
			token,
		});
	});

	it('unlinks one instance', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue(undefined);

		await expect(unlinkInstance(context, 'link-1')).resolves.toBeUndefined();
		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'DELETE', '/linked-instances/link-1');
	});

	it('encodes the id in every path', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue(linkedInstance());
		const id = 'a/b?c';

		await verifyLinkedInstance(context, id);
		await updateLinkedInstance(context, id, { name: 'Renamed' });
		await unlinkInstance(context, id);

		const paths = vi.mocked(makeRestApiRequest).mock.calls.map((call) => call[2]);
		expect(paths).toEqual([
			'/linked-instances/a%2Fb%3Fc/verify',
			'/linked-instances/a%2Fb%3Fc',
			'/linked-instances/a%2Fb%3Fc',
		]);
	});

	it('rejects a link response with an unknown shape', async () => {
		vi.mocked(makeRestApiRequest).mockResolvedValue({ ok: true });

		await expect(
			linkInstance(context, { name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() }),
		).rejects.toThrow();
	});
});
