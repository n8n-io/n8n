import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { IHttpRequestMethods } from 'n8n-workflow';

import { CorsPolicy } from '../cors-policy';
import type { WebhookAccessControlOptions } from '../webhook.types';

describe('CorsPolicy', () => {
	let corsPolicy: CorsPolicy;
	let mockRequest: Request;
	let mockResponse: Response;

	beforeEach(() => {
		corsPolicy = new CorsPolicy();
		mockRequest = mock<Request>();
		mockResponse = mock<Response>({
			header: jest.fn().mockReturnThis(),
		});
	});

	describe('applyCorsHeaders', () => {
		describe('preflight requests (OPTIONS)', () => {
			beforeEach(() => {
				mockRequest.method = 'OPTIONS';
			});

			it('should set all required preflight headers with wildcard origin', () => {
				mockRequest.headers = {
					origin: 'https://example.com',
					'access-control-request-method': 'POST',
					'access-control-request-headers': 'Content-Type',
				};

				const config = {
					allowedMethods: ['POST', 'GET'] as IHttpRequestMethods[],
					originPolicy: { allowedOrigins: '*' } as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				const result = corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(result).toBeNull();
				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', '300');
				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
			});

			it('should handle null origin with wildcard policy', () => {
				mockRequest.headers = {
					origin: 'null',
					'access-control-request-method': 'POST',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: { allowedOrigins: '*' } as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			});

			it('should handle missing origin with wildcard policy', () => {
				mockRequest.headers = {
					'access-control-request-method': 'POST',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: { allowedOrigins: '*' } as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			});

			it('should handle specific origins policy', () => {
				mockRequest.headers = {
					origin: 'https://example.com',
					'access-control-request-method': 'POST',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: {
						allowedOrigins: 'https://example.com,https://test.com',
					} as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
			});

			it('should use first allowed origin when request origin does not match', () => {
				mockRequest.headers = {
					origin: 'https://unauthorized.com',
					'access-control-request-method': 'POST',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: {
						allowedOrigins: 'https://example.com,https://test.com',
					} as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
			});

			it('should not set Access-Control-Allow-Headers if not requested', () => {
				mockRequest.headers = {
					origin: 'https://example.com',
					'access-control-request-method': 'POST',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: { allowedOrigins: '*' } as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).not.toHaveBeenCalledWith(
					'Access-Control-Allow-Headers',
					expect.anything(),
				);
			});
		});

		describe('non-preflight requests', () => {
			beforeEach(() => {
				mockRequest.method = 'POST';
			});

			it('should set CORS headers but not preflight-specific headers', () => {
				mockRequest.headers = {
					origin: 'https://example.com',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: { allowedOrigins: '*' } as WebhookAccessControlOptions,
					isPreflight: false,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'OPTIONS, POST');
				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
				expect(mockResponse.header).not.toHaveBeenCalledWith('Access-Control-Max-Age', expect.anything());
			});
		});

		describe('edge cases', () => {
			it('should handle empty allowed methods', () => {
				mockRequest.method = 'OPTIONS';
				mockRequest.headers = {
					origin: 'https://example.com',
				};

				const config = {
					allowedMethods: [] as IHttpRequestMethods[],
					originPolicy: { allowedOrigins: '*' } as WebhookAccessControlOptions,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'OPTIONS');
			});

			it('should handle undefined origin policy', () => {
				mockRequest.method = 'OPTIONS';
				mockRequest.headers = {
					origin: 'https://example.com',
				};

				const config = {
					allowedMethods: ['POST'] as IHttpRequestMethods[],
					originPolicy: undefined,
					isPreflight: true,
					requestedMethod: 'POST' as IHttpRequestMethods,
				};

				corsPolicy.applyCorsHeaders(mockRequest, mockResponse, config);

				expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			});
		});
	});

	describe('applyFallbackCorsHeaders', () => {
		it('should set fallback headers for OPTIONS requests', () => {
			mockRequest.method = 'OPTIONS';
			mockRequest.headers = {
				origin: 'null',
				'access-control-request-headers': 'Content-Type',
			};

			corsPolicy.applyFallbackCorsHeaders(mockRequest, mockResponse, ['POST']);

			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'OPTIONS, POST');
			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', '300');
			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		});

		it('should handle null origin in fallback', () => {
			mockRequest.method = 'OPTIONS';
			mockRequest.headers = {
				origin: 'null',
			};

			corsPolicy.applyFallbackCorsHeaders(mockRequest, mockResponse);

			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		});

		it('should handle missing origin in fallback', () => {
			mockRequest.method = 'OPTIONS';
			mockRequest.headers = {};

			corsPolicy.applyFallbackCorsHeaders(mockRequest, mockResponse);

			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		});

		it('should echo back valid origin in fallback', () => {
			mockRequest.method = 'OPTIONS';
			mockRequest.headers = {
				origin: 'https://example.com',
			};

			corsPolicy.applyFallbackCorsHeaders(mockRequest, mockResponse);

			expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
		});
	});
});
