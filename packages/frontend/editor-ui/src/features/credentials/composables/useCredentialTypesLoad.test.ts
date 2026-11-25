import { createPinia, setActivePinia } from 'pinia';
import type { ICredentialType } from 'n8n-workflow';
import * as credentialsApi from '@/features/credentials/credentials.api';
import { useCredentialTypesLoad } from './useCredentialTypesLoad';

const credentialType = {
	name: 'testApi',
	displayName: 'Test API',
	properties: [],
} as ICredentialType;

describe('useCredentialTypesLoad', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.restoreAllMocks();
	});

	it('reports loading while the request is pending, then loaded', async () => {
		const { promise, resolve } = Promise.withResolvers<ICredentialType[]>();
		vi.spyOn(credentialsApi, 'getCredentialTypes').mockReturnValueOnce(promise);

		const { isLoading, isLoaded, error, whenLoaded } = useCredentialTypesLoad();

		expect(isLoading.value).toBe(true);
		expect(isLoaded.value).toBe(false);

		resolve([credentialType]);
		await expect(whenLoaded()).resolves.toBeUndefined();

		expect(isLoading.value).toBe(false);
		expect(isLoaded.value).toBe(true);
		expect(error.value).toBeUndefined();
	});

	it('reports the error and stops loading when the request fails', async () => {
		const loadError = new Error('credential types');
		vi.spyOn(credentialsApi, 'getCredentialTypes').mockRejectedValueOnce(loadError);

		const { isLoading, isLoaded, error, whenLoaded, whenSettled } = useCredentialTypesLoad();

		await expect(whenSettled()).resolves.toBeUndefined();
		await expect(whenLoaded()).rejects.toBe(loadError);
		expect(error.value).toBe(loadError);
		expect(isLoading.value).toBe(false);
		expect(isLoaded.value).toBe(false);
	});

	it('shares one request between instances, and sends none once the types are loaded', async () => {
		const { promise, resolve } = Promise.withResolvers<ICredentialType[]>();
		const spy = vi.spyOn(credentialsApi, 'getCredentialTypes').mockReturnValueOnce(promise);

		const first = useCredentialTypesLoad();
		const second = useCredentialTypesLoad();
		resolve([credentialType]);
		await Promise.all([first.whenLoaded(), second.whenLoaded()]);

		const third = useCredentialTypesLoad();
		await third.whenLoaded();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(third.isLoading.value).toBe(false);
	});

	it('sends a new request from a new instance after a failed load', async () => {
		const spy = vi
			.spyOn(credentialsApi, 'getCredentialTypes')
			.mockRejectedValueOnce(new Error('credential types'))
			.mockResolvedValueOnce([credentialType]);

		await useCredentialTypesLoad().whenSettled();
		const retry = useCredentialTypesLoad();
		await retry.whenLoaded();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(retry.isLoaded.value).toBe(true);
	});
});
