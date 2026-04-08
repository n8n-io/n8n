import type { ContextEstablishmentResult } from '@n8n/decorators';

import { BearerTokenExtractor } from '../bearer-token-extractor';
import type { HttpHeaderExtractor } from '../http-header-extractor';
import { createOptions, createTriggerItem } from './utils';

describe('BearerTokenExtractor', () => {
	let bearerTokenExtractor: BearerTokenExtractor;
	let mockHttpHeaderExtractor: jest.Mocked<HttpHeaderExtractor>;

	beforeEach(() => {
		mockHttpHeaderExtractor = {
			isApplicableToTriggerNode: jest.fn(),
			execute: jest.fn(),
		} as unknown as jest.Mocked<HttpHeaderExtractor>;

		bearerTokenExtractor = new BearerTokenExtractor(mockHttpHeaderExtractor);
	});

	describe('hookDescription', () => {
		it('should have correct metadata', () => {
			expect(bearerTokenExtractor.hookDescription).toEqual({
				name: 'BearerTokenExtractor',
				displayName: 'Bearer Token Extractor',
				options: [],
			});
		});
	});

	describe('isApplicableToTriggerNode', () => {
		it('should delegate to HttpHeaderExtractor', () => {
			mockHttpHeaderExtractor.isApplicableToTriggerNode.mockReturnValue(true);

			const result = bearerTokenExtractor.isApplicableToTriggerNode('n8n-nodes-base.webhook');

			expect(mockHttpHeaderExtractor.isApplicableToTriggerNode).toHaveBeenCalledWith(
				'n8n-nodes-base.webhook',
			);
			expect(result).toBe(true);
		});

		it('should return false for non-webhook nodes', () => {
			mockHttpHeaderExtractor.isApplicableToTriggerNode.mockReturnValue(false);

			const result = bearerTokenExtractor.isApplicableToTriggerNode('n8n-nodes-base.httpRequest');

			expect(result).toBe(false);
		});
	});

	describe('execute', () => {
		it('should extract bearer token from Authorization header', async () => {
			const options = createOptions();

			const expectedResult: ContextEstablishmentResult = {
				contextUpdate: {
					credentials: {
						version: 1,
						identity: 'test-token-123',
						metadata: { source: 'http-header', headerName: 'authorization' },
					},
				},
			};

			mockHttpHeaderExtractor.execute.mockResolvedValue(expectedResult);

			const result = await bearerTokenExtractor.execute(options);

			expect(mockHttpHeaderExtractor.execute).toHaveBeenCalledWith({
				...options,
				options: {
					headerName: 'authorization',
					headerValue: '[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)',
				},
			});
			expect(result).toEqual(expectedResult);
		});

		it('should pass through all options to HttpHeaderExtractor', async () => {
			const options = createOptions({ customField: 'custom-value' } as any);

			mockHttpHeaderExtractor.execute.mockResolvedValue({});

			await bearerTokenExtractor.execute(options);

			expect(mockHttpHeaderExtractor.execute).toHaveBeenCalledWith({
				triggerItems: options.triggerItems,
				customField: 'custom-value',
				options: {
					headerName: 'authorization',
					headerValue: '[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)',
				},
			});
		});

		it('should handle case-insensitive bearer prefix', async () => {
			const testCases = [
				'Bearer token123',
				'bearer token456',
				'BEARER token789',
				'BeArEr tokenABC',
			];

			for (const authHeader of testCases) {
				const options = createOptions({
					triggerItems: [createTriggerItem({ authorization: authHeader })],
				});

				mockHttpHeaderExtractor.execute.mockResolvedValue({
					contextUpdate: {
						credentials: {
							version: 1,
							identity: authHeader.split(' ')[1],
							metadata: { source: 'http-header', headerName: 'authorization' },
						},
					},
				});

				await bearerTokenExtractor.execute(options);

				expect(mockHttpHeaderExtractor.execute).toHaveBeenCalledWith({
					...options,
					options: {
						headerName: 'authorization',
						headerValue: '[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)',
					},
				});
			}
		});

		it('should return empty result when no Authorization header present', async () => {
			const options = createOptions({ triggerItems: [createTriggerItem({})] });

			mockHttpHeaderExtractor.execute.mockResolvedValue({});

			const result = await bearerTokenExtractor.execute(options);

			expect(result).toEqual({});
		});

		it('should return empty result for malformed bearer token', async () => {
			const options = createOptions({
				triggerItems: [createTriggerItem({ authorization: 'NotBearer token123' })],
			});

			mockHttpHeaderExtractor.execute.mockResolvedValue({});

			const result = await bearerTokenExtractor.execute(options);

			expect(result).toEqual({});
		});
	});
});
