import { mock } from 'jest-mock-extended';
import type { Cipher } from 'n8n-core';
import type { IRunExecutionData } from 'n8n-workflow';

import { InboundSecretsAccessService } from '../inbound-secrets-access.service';

const ENCRYPTED_BLOB = 'encrypted-blob-placeholder';

const buildRunExecutionData = (secureArtifacts: unknown): IRunExecutionData =>
	({
		executionData: {
			runtimeData: { secureArtifacts },
		},
	}) as unknown as IRunExecutionData;

describe('InboundSecretsAccessService', () => {
	const cipher = mock<Cipher>();
	const service = new InboundSecretsAccessService(cipher);

	const plaintextArtifacts = JSON.stringify({
		version: 1,
		artifacts: {
			Webhook: [
				{ 'headers.authorization': 'Bearer xyz', 'headers.content-type': 'json' },
				{ 'headers.authorization': 'Bearer abc' },
			],
		},
	});

	beforeEach(() => {
		jest.clearAllMocks();
		cipher.decryptV2.mockResolvedValue(plaintextArtifacts);
	});

	it('returns the leaf value for the given source node, path, and itemIndex', async () => {
		const result = await service.getInboundArtifacts(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'Webhook',
			'headers.authorization',
			0,
		);

		expect(result).toBe('Bearer xyz');
		expect(cipher.decryptV2).toHaveBeenCalledWith(ENCRYPTED_BLOB);
	});

	it('addresses artifacts by itemIndex', async () => {
		const result = await service.getInboundArtifacts(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'Webhook',
			'headers.authorization',
			1,
		);

		expect(result).toBe('Bearer abc');
	});

	it('returns undefined when the source node is not in the artifacts map', async () => {
		const result = await service.getInboundArtifacts(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'Unknown',
			'headers.authorization',
			0,
		);

		expect(result).toBeUndefined();
	});

	it('returns undefined when the requested path is not in the inner map', async () => {
		const result = await service.getInboundArtifacts(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'Webhook',
			'headers.missing',
			0,
		);

		expect(result).toBeUndefined();
	});

	it('returns undefined when itemIndex is out of range', async () => {
		const result = await service.getInboundArtifacts(
			buildRunExecutionData(ENCRYPTED_BLOB),
			'Webhook',
			'headers.authorization',
			99,
		);

		expect(result).toBeUndefined();
	});

	it('returns undefined and does not call the cipher when secureArtifacts is absent', async () => {
		const runExecutionData = {
			executionData: { runtimeData: {} },
		} as unknown as IRunExecutionData;

		const result = await service.getInboundArtifacts(
			runExecutionData,
			'Webhook',
			'headers.authorization',
			0,
		);

		expect(result).toBeUndefined();
		expect(cipher.decryptV2).not.toHaveBeenCalled();
	});

	it('returns undefined and does not call the cipher when secureArtifacts is not a string', async () => {
		const result = await service.getInboundArtifacts(
			buildRunExecutionData({ not: 'a string' }),
			'Webhook',
			'headers.authorization',
			0,
		);

		expect(result).toBeUndefined();
		expect(cipher.decryptV2).not.toHaveBeenCalled();
	});

	it('throws when the decrypted payload is not a valid ISecureArtifacts shape', async () => {
		cipher.decryptV2.mockResolvedValueOnce('not json');

		await expect(
			service.getInboundArtifacts(
				buildRunExecutionData(ENCRYPTED_BLOB),
				'Webhook',
				'headers.authorization',
				0,
			),
		).rejects.toThrow();
	});
});
