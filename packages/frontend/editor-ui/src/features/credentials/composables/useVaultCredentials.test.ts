import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import type { INodeProperties } from 'n8n-workflow';

import { getVaultStatus } from '../credentials.api';
import {
	isSecretProperty,
	resetVaultCredentialsStatus,
	useVaultCredentials,
} from './useVaultCredentials';

vi.mock('../credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getVaultStatus: vi.fn(),
}));

describe('useVaultCredentials', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		resetVaultCredentialsStatus();
		vi.mocked(getVaultStatus).mockReset();
	});

	it('is off until the server says vault entry is on', async () => {
		vi.mocked(getVaultStatus).mockResolvedValue({ enabled: true });

		const { vaultEnabled } = useVaultCredentials();
		expect(vaultEnabled.value).toBe(false);

		await flushPromises();
		expect(vaultEnabled.value).toBe(true);
	});

	it('stays off when the status request fails', async () => {
		vi.mocked(getVaultStatus).mockRejectedValue(new Error('offline'));

		const { vaultEnabled } = useVaultCredentials();
		await flushPromises();

		expect(vaultEnabled.value).toBe(false);
	});

	it('asks the server once for the whole session', async () => {
		vi.mocked(getVaultStatus).mockResolvedValue({ enabled: false });

		useVaultCredentials();
		useVaultCredentials();
		await flushPromises();

		expect(getVaultStatus).toHaveBeenCalledTimes(1);
	});
});

describe('isSecretProperty', () => {
	const base = { displayName: 'Field', name: 'field', type: 'string', default: '' } as const;

	it('treats masked fields as secrets', () => {
		expect(isSecretProperty({ ...base, typeOptions: { password: true } } as INodeProperties)).toBe(
			true,
		);
	});

	it('does not treat other fields as secrets', () => {
		expect(isSecretProperty({ ...base } as INodeProperties)).toBe(false);
		expect(isSecretProperty({ ...base, typeOptions: { rows: 3 } } as INodeProperties)).toBe(false);
	});
});
