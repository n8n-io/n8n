import mock from 'jest-mock-extended/lib/Mock';
import { SourceControlExportService } from '../sourceControlExport.service.ee';
import type { SourceControlledFile } from '../types/sourceControlledFile';
import { Cipher, type InstanceSettings } from 'n8n-core';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { mockInstance } from '@test/mocking';

import type { SharedCredentials } from '@/databases/entities/SharedCredentials';
import type { CredentialsEntity } from '@/databases/entities/CredentialsEntity';
import Container from 'typedi';
import { ApplicationError, deepCopy } from 'n8n-workflow';

// https://github.com/jestjs/jest/issues/4715
function deepSpyOn<O extends object, M extends keyof O>(object: O, methodName: M) {
	const spy = jest.fn();
	// eslint-disable-next-line @typescript-eslint/ban-types
	const originalMethod = object[methodName];

	if (typeof originalMethod !== 'function') {
		throw new ApplicationError(`${methodName.toString()} is not a function`, { level: 'warning' });
	}

	object[methodName] = function (...args: unknown[]) {
		const clonedArgs = deepCopy(args);
		spy(...clonedArgs);
		return originalMethod.apply(this, args);
	} as O[M];

	return spy;
}

describe('SourceControlExportService', () => {
	const service = new SourceControlExportService(
		mock(),
		mock(),
		mock(),
		mock<InstanceSettings>({ n8nFolder: '' }),
	);

	describe('exportCredentialsToWorkFolder', () => {
		it('should export credentials to work folder', async () => {
			/**
			 * Arrange
			 */
			// @ts-expect-error Private method
			const replaceSpy = deepSpyOn(service, 'replaceCredentialData');

			mockInstance(SharedCredentialsRepository).findByCredentialIds.mockResolvedValue([
				mock<SharedCredentials>({
					credentials: mock<CredentialsEntity>({
						data: Container.get(Cipher).encrypt(
							JSON.stringify({
								authUrl: 'test',
								accessTokenUrl: 'test',
								clientId: 'test',
								clientSecret: 'test',
								oauthTokenData: {
									access_token: 'test',
									token_type: 'test',
									expires_in: 123,
									refresh_token: 'test',
								},
							}),
						),
					}),
				}),
			]);

			/**
			 * Act
			 */
			await service.exportCredentialsToWorkFolder([mock<SourceControlledFile>()]);

			/**
			 * Assert
			 */
			expect(replaceSpy).toHaveBeenCalledWith({
				authUrl: 'test',
				accessTokenUrl: 'test',
				clientId: 'test',
				clientSecret: 'test',
			});
		});
	});
});
