import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { NextFunction, Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import { UnrecognizedCredentialTypeError } from 'n8n-core';
import type { ICredentialType } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';
import { CredentialsOverwrites } from '@/credentials-overwrites';

describe('CredentialsOverwrites', () => {
	const testCredentialType = mock<ICredentialType>({ name: 'test', extends: ['parent'] });
	const parentCredentialType = mock<ICredentialType>({ name: 'parent', extends: undefined });

	const globalConfig = mock<GlobalConfig>({ credentials: { overwrite: {} } });
	const credentialTypes = mock<CredentialTypes>();
	const logger = mock<Logger>();
	let credentialsOverwrites: CredentialsOverwrites;

	beforeEach(() => {
		jest.resetAllMocks();

		globalConfig.credentials.overwrite.data = JSON.stringify({
			test: { username: 'user' },
			parent: { password: 'pass' },
		});
		credentialTypes.recognizes.mockReturnValue(true);
		credentialTypes.getByName.mockImplementation((credentialType) => {
			if (credentialType === testCredentialType.name) return testCredentialType;
			if (credentialType === parentCredentialType.name) return parentCredentialType;
			throw new UnrecognizedCredentialTypeError(credentialType);
		});
		credentialTypes.getParentTypes
			.calledWith(testCredentialType.name)
			.mockReturnValue([parentCredentialType.name]);

		credentialsOverwrites = new CredentialsOverwrites(globalConfig, credentialTypes, logger);
	});

	describe('constructor', () => {
		it('should parse and set overwrite data from config', () => {
			expect(credentialsOverwrites.getAll()).toEqual({
				parent: { password: 'pass' },
				test: {
					password: 'pass',
					username: 'user',
				},
			});
		});
	});

	describe('getOverwriteEndpointMiddleware', () => {
		it('should return null if endpointAuthToken is not provided', () => {
			globalConfig.credentials.overwrite.endpointAuthToken = '';
			const localCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
			);
			const middleware = localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			expect(middleware).toBeNull();
		});

		it('should return a middleware function, if endpointAuthToken is provided', () => {
			globalConfig.credentials.overwrite.endpointAuthToken = 'test-token';
			const localCredentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
			);
			const middleware = localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			expect(typeof middleware).toBe('function');
		});

		describe('middleware', () => {
			let next: () => void;
			let send: () => void;
			let status: () => {
				send: () => void;
			};
			let middleware: null | ((req: Request, res: Response, next: NextFunction) => void);
			beforeEach(() => {
				globalConfig.credentials.overwrite.endpointAuthToken = 'test-token';
				next = jest.fn();
				send = jest.fn();
				status = jest.fn().mockImplementation(() => {
					return {
						send,
					};
				});

				const localCredentialsOverwrites = new CredentialsOverwrites(
					globalConfig,
					credentialTypes,
					logger,
				);
				middleware = localCredentialsOverwrites.getOverwriteEndpointMiddleware();
			});

			it('should call next with correct credentials', () => {
				middleware!(
					{
						headers: {
							authorization: `Bearer ${globalConfig.credentials.overwrite.endpointAuthToken}`,
						},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).toHaveBeenCalled();
				expect(status).not.toHaveBeenCalled();
				expect(send).not.toHaveBeenCalled();
			});

			it('should respond with 401 with invalid token', () => {
				middleware!(
					{
						headers: {
							authorization: 'Bearer invalid-token',
						},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).not.toHaveBeenCalled();
				expect(status).toHaveBeenCalledWith(401);
				expect(send).toHaveBeenCalled();
			});

			it('should respond with 401 without token', () => {
				middleware!(
					{
						headers: {},
					} as any as Request,
					{
						status,
					} as any as Response,
					next,
				);
				expect(next).not.toHaveBeenCalled();
				expect(status).toHaveBeenCalledWith(401);
				expect(send).toHaveBeenCalled();
			});
		});
	});

	describe('setData', () => {
		it('should reset resolvedTypes when setting new data', () => {
			const newData = { test: { token: 'test-token' } };
			credentialsOverwrites.setData(newData);

			expect(credentialsOverwrites.getAll()).toEqual(newData);
		});
	});

	describe('applyOverwrite', () => {
		it('should apply overwrites only for empty fields', () => {
			const result = credentialsOverwrites.applyOverwrite('test', {
				username: 'existingUser',
				password: '',
			});

			expect(result).toEqual({
				username: 'existingUser',
				password: 'pass',
			});
		});

		it('should return original data if no overwrites exist', () => {
			const data = {
				username: 'user1',
				password: 'pass1',
			};

			credentialTypes.getParentTypes.mockReturnValueOnce([]);

			const result = credentialsOverwrites.applyOverwrite('unknownCredential', data);
			expect(result).toEqual(data);
		});
	});

	describe('getOverwrites', () => {
		it('should return undefined for unrecognized credential type', () => {
			credentialTypes.recognizes.mockReturnValue(false);

			const result = credentialsOverwrites.getOverwrites('unknownType');

			expect(result).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unknown credential type'));
		});

		it('should cache resolved types', () => {
			credentialsOverwrites.getOverwrites('parent');
			const firstCall = credentialsOverwrites.getOverwrites('test');
			const secondCall = credentialsOverwrites.getOverwrites('test');

			expect(firstCall).toEqual(secondCall);
			expect(credentialTypes.getByName).toHaveBeenCalledTimes(2);

			expect(credentialsOverwrites['resolvedTypes']).toEqual(['parent', 'test']);
		});

		it('should merge overwrites from parent types', () => {
			credentialTypes.getByName.mockImplementation((credentialType) => {
				if (credentialType === 'childType')
					return mock<ICredentialType>({ extends: ['parentType1', 'parentType2'] });
				if (credentialType === 'parentType1') return mock<ICredentialType>({ extends: undefined });
				if (credentialType === 'parentType2') return mock<ICredentialType>({ extends: undefined });
				throw new UnrecognizedCredentialTypeError(credentialType);
			});

			globalConfig.credentials.overwrite.data = JSON.stringify({
				childType: { specificField: 'childValue' },
				parentType1: { parentField1: 'value1' },
				parentType2: { parentField2: 'value2' },
			});

			const credentialsOverwrites = new CredentialsOverwrites(
				globalConfig,
				credentialTypes,
				logger,
			);

			const result = credentialsOverwrites.getOverwrites('childType');

			expect(result).toEqual({
				parentField1: 'value1',
				parentField2: 'value2',
				specificField: 'childValue',
			});
		});
	});
});
