import { createTestingPinia } from '@pinia/testing';
import { ResponseError } from '@n8n/rest-api-client';
import { setActivePinia } from 'pinia';

import type * as Api from '../linkedInstances.api';
import { useLinkedInstancesStore } from '../linkedInstances.store';
import { deferred, fakeToken, linkedInstance } from './linkedInstances.fixtures';

const api = vi.hoisted(() => ({
	fetchLinkedInstances: vi.fn<typeof Api.fetchLinkedInstances>(),
	linkInstance: vi.fn<typeof Api.linkInstance>(),
	verifyLinkedInstance: vi.fn<typeof Api.verifyLinkedInstance>(),
	updateLinkedInstance: vi.fn<typeof Api.updateLinkedInstance>(),
	unlinkInstance: vi.fn<typeof Api.unlinkInstance>(),
}));

vi.mock('../linkedInstances.api', () => api);

const first = linkedInstance();
const second = linkedInstance({ id: 'link-2', name: 'Staging', status: 'offline' });

describe('useLinkedInstancesStore', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		vi.resetAllMocks();
		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		api.fetchLinkedInstances.mockResolvedValue([first, second]);
	});

	describe('fetchInstances', () => {
		it('loads the list and marks it loaded', async () => {
			const store = useLinkedInstancesStore();

			await store.fetchInstances();

			expect(store.instances).toEqual([first, second]);
			expect(store.hasLoaded).toBe(true);
			expect(store.loadFailed).toBe(false);
			expect(store.isLoading).toBe(false);
		});

		it('shows that it is loading until the read ends', async () => {
			const read = deferred<Array<typeof first>>();
			api.fetchLinkedInstances.mockReturnValue(read.promise);
			const store = useLinkedInstancesStore();

			const loading = store.fetchInstances();
			expect(store.isLoading).toBe(true);

			read.resolve([first]);
			await loading;
			expect(store.isLoading).toBe(false);
		});

		it('records a failed read without rejecting, and keeps the old rows', async () => {
			const store = useLinkedInstancesStore();
			await store.fetchInstances();
			api.fetchLinkedInstances.mockRejectedValue(new ResponseError('Server down'));

			await expect(store.fetchInstances()).resolves.toBeUndefined();

			expect(store.loadFailed).toBe(true);
			expect(store.isLoading).toBe(false);
			expect(store.instances).toEqual([first, second]);
		});

		it('clears the failure when a later read works', async () => {
			api.fetchLinkedInstances.mockRejectedValueOnce(new ResponseError('Server down'));
			const store = useLinkedInstancesStore();
			await store.fetchInstances();
			expect(store.hasLoaded).toBe(false);

			await store.fetchInstances();

			expect(store.loadFailed).toBe(false);
			expect(store.hasLoaded).toBe(true);
		});

		it('shares one request between calls that overlap', async () => {
			const store = useLinkedInstancesStore();

			await Promise.all([store.fetchInstances(), store.fetchInstances()]);

			expect(api.fetchLinkedInstances).toHaveBeenCalledTimes(1);
		});

		it('sends a new request after the previous one ended', async () => {
			const store = useLinkedInstancesStore();

			await store.fetchInstances();
			await store.fetchInstances();

			expect(api.fetchLinkedInstances).toHaveBeenCalledTimes(2);
		});

		it('reads again when an unlink lands during the read, so the row does not come back', async () => {
			const staleRead = deferred<Array<typeof first>>();
			api.fetchLinkedInstances
				.mockReturnValueOnce(staleRead.promise)
				.mockResolvedValueOnce([second]);
			api.unlinkInstance.mockResolvedValue(undefined);
			const store = useLinkedInstancesStore();
			store.instances = [first, second];

			const loading = store.fetchInstances();
			await store.unlink(first.id);
			staleRead.resolve([first, second]);
			await loading;

			expect(api.fetchLinkedInstances).toHaveBeenCalledTimes(2);
			expect(store.instances).toEqual([second]);
		});

		it('stops reading again after three reads, so a busy list cannot loop', async () => {
			const store = useLinkedInstancesStore();
			// Every read lands after a change that the store made.
			api.fetchLinkedInstances.mockImplementation(async () => {
				api.verifyLinkedInstance.mockResolvedValueOnce(first);
				await store.verify(first.id);
				return [first];
			});

			await store.fetchInstances();

			expect(api.fetchLinkedInstances).toHaveBeenCalledTimes(3);
			expect(store.instances).toEqual([first]);
			expect(store.hasLoaded).toBe(true);
		});
	});

	describe('link', () => {
		it('adds the new link at the end and returns it', async () => {
			const created = linkedInstance({ id: 'link-3', name: 'Production' });
			api.linkInstance.mockResolvedValue(created);
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			const result = await store.link({
				name: 'Production',
				url: 'prod.example.com',
				token: fakeToken(),
			});

			expect(result).toEqual(created);
			expect(store.instances).toEqual([first, second, created]);
		});

		it('replaces a row with the same id instead of adding it twice', async () => {
			const renamed = { ...first, name: 'Acme EU' };
			api.linkInstance.mockResolvedValue(renamed);
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await store.link({ name: 'Acme EU', url: 'acme.app.n8n.cloud', token: fakeToken() });

			expect(store.instances.map((item) => item.id)).toEqual([second.id, first.id]);
			expect(store.instances.filter((item) => item.id === first.id)).toHaveLength(1);
		});

		it('passes the token to the API and keeps it out of the store state', async () => {
			const token = fakeToken();
			api.linkInstance.mockResolvedValue(linkedInstance({ id: 'link-3' }));
			const store = useLinkedInstancesStore();

			await store.link({ name: 'Acme', url: 'acme.app.n8n.cloud', token });

			expect(api.linkInstance).toHaveBeenCalledWith(expect.anything(), {
				name: 'Acme',
				url: 'acme.app.n8n.cloud',
				token,
			});
			expect(JSON.stringify(pinia.state.value)).not.toContain(token);
		});

		it('changes nothing when the server refuses the link', async () => {
			api.linkInstance.mockRejectedValue(
				new ResponseError('That instance refused the access token.'),
			);
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await expect(
				store.link({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() }),
			).rejects.toThrow('That instance refused the access token.');
			expect(store.instances).toEqual([first, second]);
		});
	});

	describe('verify', () => {
		it('replaces the row with the new status in place', async () => {
			const checked = { ...first, status: 'unauthorised' as const };
			api.verifyLinkedInstance.mockResolvedValue(checked);
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await expect(store.verify(first.id)).resolves.toEqual(checked);

			expect(store.instances).toEqual([checked, second]);
		});

		it('does not add back a row that is no longer in the list', async () => {
			api.verifyLinkedInstance.mockResolvedValue(linkedInstance({ id: 'gone' }));
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await store.verify('gone');

			expect(store.instances).toEqual([first, second]);
		});

		it('rejects and keeps the row when the check request fails', async () => {
			api.verifyLinkedInstance.mockRejectedValue(new ResponseError('Too many requests'));
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await expect(store.verify(first.id)).rejects.toThrow('Too many requests');
			expect(store.instances).toEqual([first, second]);
		});
	});

	describe('changeToken', () => {
		it('sends only the token and keeps it out of the store state', async () => {
			const token = fakeToken();
			const updated = { ...second, status: 'online' as const };
			api.updateLinkedInstance.mockResolvedValue(updated);
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await store.changeToken(second.id, token);

			expect(api.updateLinkedInstance).toHaveBeenCalledWith(expect.anything(), second.id, {
				token,
			});
			expect(store.instances).toEqual([first, updated]);
			expect(JSON.stringify(pinia.state.value)).not.toContain(token);
		});

		it('keeps the row when the server refuses the token', async () => {
			api.updateLinkedInstance.mockRejectedValue(new ResponseError('Refused'));
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await expect(store.changeToken(first.id, fakeToken())).rejects.toThrow('Refused');
			expect(store.instances).toEqual([first, second]);
		});
	});

	describe('unlink', () => {
		it('removes the row after the server confirms', async () => {
			api.unlinkInstance.mockResolvedValue(undefined);
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await store.unlink(first.id);

			expect(api.unlinkInstance).toHaveBeenCalledWith(expect.anything(), first.id);
			expect(store.instances).toEqual([second]);
		});

		it('keeps the row when the server refuses', async () => {
			api.unlinkInstance.mockRejectedValue(new ResponseError('Not found'));
			const store = useLinkedInstancesStore();
			await store.fetchInstances();

			await expect(store.unlink(first.id)).rejects.toThrow('Not found');
			expect(store.instances).toEqual([first, second]);
		});
	});
});
