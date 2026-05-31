import '@/zod-alias-support';

import type { CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { ICredentialType } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { ImportCredentialsCommand } from '../credentials';

import { CredentialTypes } from '@/credential-types';

describe('ImportCredentialsCommand', () => {
	const credentialTypes = mock<CredentialTypes>();

	beforeAll(() => {
		Container.set(CredentialTypes, credentialTypes);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('validateImportedTypeVersion', () => {
		const validate = (credential: Partial<CredentialsEntity>) => {
			const command = new ImportCredentialsCommand();
			// @ts-expect-error access private for test
			command.validateImportedTypeVersion(credential);
		};

		it('lands NULL when typeVersion is absent', () => {
			expect(() => validate({ id: '1', type: 'aws' })).not.toThrow();
			expect(credentialTypes.getByName).not.toHaveBeenCalled();
		});

		it('lands NULL when typeVersion is explicitly null', () => {
			expect(() =>
				validate({ id: '1', type: 'aws', typeVersion: null } as Partial<CredentialsEntity>),
			).not.toThrow();
			expect(credentialTypes.getByName).not.toHaveBeenCalled();
		});

		it('accepts a numeric typeVersion declared by the type', () => {
			credentialTypes.getByName.mockReturnValue({
				name: 'aws',
				version: [1, 2],
				defaultVersion: 2,
			} as ICredentialType);

			expect(() => validate({ id: '1', type: 'aws', typeVersion: 2 })).not.toThrow();
		});

		it('throws when typeVersion is not declared by the type', () => {
			credentialTypes.getByName.mockReturnValue({
				name: 'aws',
				version: [1, 2],
				defaultVersion: 2,
			} as ICredentialType);

			expect(() => validate({ id: 'cred-99', type: 'aws', typeVersion: 99 })).toThrow(UserError);
			expect(() => validate({ id: 'cred-99', type: 'aws', typeVersion: 99 })).toThrow(/cred-99/);
			expect(() => validate({ id: 'cred-99', type: 'aws', typeVersion: 99 })).toThrow(/\[1,2\]/);
		});

		it('throws on non-numeric or negative typeVersion', () => {
			expect(() =>
				validate({
					id: 'cred-bad',
					type: 'aws',
					typeVersion: 'two' as unknown as number,
				} as Partial<CredentialsEntity>),
			).toThrow(UserError);
			expect(() => validate({ id: 'cred-bad', type: 'aws', typeVersion: -1 })).toThrow(UserError);
			expect(() => validate({ id: 'cred-bad', type: 'aws', typeVersion: Infinity })).toThrow(
				UserError,
			);
		});

		it('does not throw if the credential type is unknown — leaves that error to the import flow', () => {
			credentialTypes.getByName.mockImplementation(() => {
				throw new Error('unknown type');
			});

			expect(() => validate({ id: 'cred', type: 'mystery', typeVersion: 2 })).not.toThrow();
		});
	});
});
