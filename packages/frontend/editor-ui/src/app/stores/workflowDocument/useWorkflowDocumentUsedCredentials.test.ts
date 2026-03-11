import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentUsedCredentials } from './useWorkflowDocumentUsedCredentials';
import type { IUsedCredential } from '@/features/credentials/credentials.types';

function createUsedCredentials() {
	return useWorkflowDocumentUsedCredentials();
}

function createCredential(overrides: Partial<IUsedCredential> = {}): IUsedCredential {
	return {
		id: '1',
		name: 'Test Credential',
		credentialType: 'testApi',
		currentUserHasAccess: true,
		...overrides,
	};
}

describe('useWorkflowDocumentUsedCredentials', () => {
	describe('initial state', () => {
		it('should start with empty record', () => {
			const { usedCredentials } = createUsedCredentials();
			expect(usedCredentials.value).toEqual({});
		});
	});

	describe('setUsedCredentials', () => {
		it('should convert array to record keyed by id and fire event hook', () => {
			const { usedCredentials, setUsedCredentials, onUsedCredentialsChange } =
				createUsedCredentials();
			const hookSpy = vi.fn();
			onUsedCredentialsChange(hookSpy);

			const cred1 = createCredential({ id: '1', name: 'Cred 1' });
			const cred2 = createCredential({ id: '2', name: 'Cred 2' });
			setUsedCredentials([cred1, cred2]);

			expect(usedCredentials.value).toEqual({ '1': cred1, '2': cred2 });
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { usedCredentials: { '1': cred1, '2': cred2 } },
			});
		});

		it('should replace existing value', () => {
			const { usedCredentials, setUsedCredentials } = createUsedCredentials();
			setUsedCredentials([createCredential({ id: '1' })]);

			const newCred = createCredential({ id: '2', name: 'New' });
			setUsedCredentials([newCred]);

			expect(usedCredentials.value).toEqual({ '2': newCred });
		});

		it('should handle empty array', () => {
			const { usedCredentials, setUsedCredentials } = createUsedCredentials();
			setUsedCredentials([createCredential({ id: '1' })]);

			setUsedCredentials([]);

			expect(usedCredentials.value).toEqual({});
		});

		it('should fire event hook on every call', () => {
			const { setUsedCredentials, onUsedCredentialsChange } = createUsedCredentials();
			const hookSpy = vi.fn();
			onUsedCredentialsChange(hookSpy);

			setUsedCredentials([createCredential({ id: '1' })]);
			setUsedCredentials([]);

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
