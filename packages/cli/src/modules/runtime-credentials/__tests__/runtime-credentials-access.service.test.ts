import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';
import type { IRunExecutionData } from 'n8n-workflow';

import { RuntimeCredentialsAccessService } from '../runtime-credentials-access.service';

const ENCRYPTED_BLOB = 'encrypted-blob-placeholder';

const buildRunExecutionData = (secureArtifacts: unknown): IRunExecutionData =>
	({
		executionData: {
			runtimeData: { secureArtifacts },
		},
	}) as unknown as IRunExecutionData;

describe('RuntimeCredentialsAccessService', () => {
	const cipher = mock<Cipher>();
	const service = new RuntimeCredentialsAccessService(cipher);

	const plaintextArtifacts = JSON.stringify({
		version: 1,
		artifacts: {
			api_key: ['Bearer xyz', 'Bearer abc'],
		},
	});

	beforeEach(() => {
		jest.clearAllMocks();
		cipher.decryptV2.mockResolvedValue(plaintextArtifacts);
	});

	it('returns the array stored under the requested alias', async () => {
		const result = await service.getRuntimeCredential(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'api_key',
		);

		expect(result).toEqual(['Bearer xyz', 'Bearer abc']);
		expect(cipher.decryptV2).toHaveBeenCalledWith(ENCRYPTED_BLOB);
	});

	it('returns undefined when the alias is not in the artifacts map', async () => {
		const result = await service.getRuntimeCredential(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'unknown_alias',
		);

		expect(result).toBeUndefined();
	});

	it('returns undefined and does not call the cipher when secureArtifacts is absent', async () => {
		const runExecutionData = {
			executionData: { runtimeData: {} },
		} as unknown as IRunExecutionData;

		const result = await service.getRuntimeCredential(runExecutionData, 'api_key');

		expect(result).toBeUndefined();
		expect(cipher.decryptV2).not.toHaveBeenCalled();
	});

	it('returns undefined and does not call the cipher when secureArtifacts is not a string', async () => {
		const result = await service.getRuntimeCredential(
			buildRunExecutionData({ not: 'a string' }),
			'api_key',
		);

		expect(result).toBeUndefined();
		expect(cipher.decryptV2).not.toHaveBeenCalled();
	});

	it('throws when the decrypted payload is not a valid ISecureArtifacts shape', async () => {
		cipher.decryptV2.mockResolvedValueOnce('not json');

		await expect(
			service.getRuntimeCredential(buildRunExecutionData(ENCRYPTED_BLOB), 'api_key'),
		).rejects.toThrow();
	});
});
