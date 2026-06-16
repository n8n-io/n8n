import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '../../credentials.store';
import { useCredentialTestInBackground } from '../useCredentialTestInBackground';

describe('useCredentialTestInBackground', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.credentialTestResults = new Map();
	});

	describe('hydrateCredentialTestResults', () => {
		it('writes success and error entries to the credentials store', () => {
			const { hydrateCredentialTestResults } = useCredentialTestInBackground();

			hydrateCredentialTestResults([
				{ id: 'cred-ok', success: true },
				{ id: 'cred-bad', success: false },
			]);

			expect(credentialsStore.credentialTestResults.get('cred-ok')).toBe('success');
			expect(credentialsStore.credentialTestResults.get('cred-bad')).toBe('error');
		});

		it('overwrites existing entries when re-hydrating with a new result', () => {
			credentialsStore.credentialTestResults.set('cred-1', 'error');
			const { hydrateCredentialTestResults } = useCredentialTestInBackground();

			hydrateCredentialTestResults([{ id: 'cred-1', success: true }]);

			expect(credentialsStore.credentialTestResults.get('cred-1')).toBe('success');
		});

		it('is a no-op for an empty list', () => {
			const { hydrateCredentialTestResults } = useCredentialTestInBackground();

			hydrateCredentialTestResults([]);

			expect(credentialsStore.credentialTestResults.size).toBe(0);
		});
	});
});
