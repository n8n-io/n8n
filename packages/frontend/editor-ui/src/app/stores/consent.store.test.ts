import { createPinia, setActivePinia } from 'pinia';

import { useConsentStore } from './consent.store';
import { ResponseError } from '@n8n/rest-api-client/utils';

const { getConsentDetails, approveConsent } = vi.hoisted(() => ({
	getConsentDetails: vi.fn(),
	approveConsent: vi.fn(),
}));

vi.mock('@n8n/rest-api-client/api/consent', () => ({
	getConsentDetails,
	approveConsent,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', pushRef: 'test' },
	})),
}));

describe('useConsentStore', () => {
	let consentStore: ReturnType<typeof useConsentStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		consentStore = useConsentStore();
	});

	it('stores the resolved details and clears loading', async () => {
		const details = { clientName: 'Test Client', clientId: 'client-1', scopes: [] };
		getConsentDetails.mockResolvedValue(details);

		const result = await consentStore.fetchConsentDetails();

		expect(result).toEqual(details);
		expect(consentStore.consentDetails).toEqual(details);
		expect(consentStore.isLoading).toBe(false);
	});

	it('sets a resource_unavailable error code on a 422', async () => {
		getConsentDetails.mockRejectedValue(new ResponseError('gone', { httpStatusCode: 422 }));

		await expect(consentStore.fetchConsentDetails()).rejects.toThrow('gone');

		expect(consentStore.errorCode).toBe('resource_unavailable');
		expect(consentStore.error).toBe('gone');
		expect(consentStore.isLoading).toBe(false);
	});

	// A component that abandons one fetch (e.g. it re-fetches, or a fresh mount starts
	// its own call) must not have its result overwritten by the earlier, now-stale one
	// resolving later — regardless of which settles first.
	it('ignores a stale call that resolves after a newer one', async () => {
		let resolveStale!: (value: unknown) => void;
		getConsentDetails.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveStale = resolve;
			}),
		);
		const staleCall = consentStore.fetchConsentDetails();

		const freshDetails = { clientName: 'Fresh Client', clientId: 'client-2', scopes: [] };
		getConsentDetails.mockResolvedValueOnce(freshDetails);
		await consentStore.fetchConsentDetails();

		expect(consentStore.consentDetails).toEqual(freshDetails);

		resolveStale({ clientName: 'Stale Client', clientId: 'client-1', scopes: [] });
		await staleCall;

		expect(consentStore.consentDetails).toEqual(freshDetails);
	});

	it('ignores a stale call failing after a newer one succeeded', async () => {
		let rejectStale!: (reason: unknown) => void;
		getConsentDetails.mockReturnValueOnce(
			new Promise((_resolve, reject) => {
				rejectStale = reject;
			}),
		);
		const staleCall = consentStore.fetchConsentDetails().catch(() => {});

		const freshDetails = { clientName: 'Fresh Client', clientId: 'client-2', scopes: [] };
		getConsentDetails.mockResolvedValueOnce(freshDetails);
		await consentStore.fetchConsentDetails();

		rejectStale(new Error('stale failure'));
		await staleCall;

		expect(consentStore.consentDetails).toEqual(freshDetails);
		expect(consentStore.error).toBeNull();
		expect(consentStore.isLoading).toBe(false);
	});
});
