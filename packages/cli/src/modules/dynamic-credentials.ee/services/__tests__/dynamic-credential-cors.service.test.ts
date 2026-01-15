import type { Request, Response } from 'express';

import type { CorsService } from '@/services/cors-service';

import type { DynamicCredentialsConfig } from '../../dynamic-credentials.config';
import { DynamicCredentialCorsService } from '../dynamic-credential-cors.service';

describe('DynamicCredentialCorsService', () => {
	let mockCorsService: jest.Mocked<CorsService>;
	let mockConfig: jest.Mocked<DynamicCredentialsConfig>;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let statusSpy: jest.Mock;
	let endSpy: jest.Mock;

	beforeEach(() => {
		mockCorsService = {
			applyCorsHeaders: jest.fn(),
		} as unknown as jest.Mocked<CorsService>;

		mockConfig = {
			corsOrigin: '',
			corsAllowCredentials: false,
		};

		statusSpy = jest.fn().mockReturnThis();
		endSpy = jest.fn();

		mockRequest = {
			headers: {},
		};

		mockResponse = {
			status: statusSpy,
			end: endSpy,
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('constructor()', () => {
		it('should disable CORS when corsOrigin is null, empty, or whitespace', () => {
			// Test 1: corsOrigin = '' → defaultOptions = null
			mockConfig.corsOrigin = '';
			const service2 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service2['defaultOptions']).toBeNull();

			// Test 2: corsOrigin = '   ' → defaultOptions = null
			mockConfig.corsOrigin = '   ';
			const service3 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service3['defaultOptions']).toBeNull();

			// Test 3: corsOrigin = ' , , ' → defaultOptions = null
			mockConfig.corsOrigin = ' , , ';
			const service4 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service4['defaultOptions']).toBeNull();
		});

		it('should parse and trim comma-separated origins correctly', () => {
			// Test 1: 'https://app.com' → ['https://app.com']
			mockConfig.corsOrigin = 'https://app.com';
			const service1 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service1['defaultOptions']?.allowedOrigins).toEqual(['https://app.com']);
			expect(service1['defaultOptions']?.allowedHeaders).toEqual([
				'Authorization',
				'Content-Type',
				'X-Requested-With',
			]);

			// Test 2: 'https://app.com,https://admin.com' → ['https://app.com', 'https://admin.com']
			mockConfig.corsOrigin = 'https://app.com,https://admin.com';
			const service2 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service2['defaultOptions']?.allowedOrigins).toEqual([
				'https://app.com',
				'https://admin.com',
			]);

			// Test 3: ' https://app.com , https://admin.com ' → trimmed and filtered
			mockConfig.corsOrigin = ' https://app.com , https://admin.com ';
			const service3 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service3['defaultOptions']?.allowedOrigins).toEqual([
				'https://app.com',
				'https://admin.com',
			]);
			expect(service3['defaultOptions']?.allowedHeaders).toEqual([
				'Authorization',
				'Content-Type',
				'X-Requested-With',
			]);
		});

		it('should set allowCredentials from config', () => {
			mockConfig.corsOrigin = 'https://app.com';

			// Test 1: corsAllowCredentials = true → defaultOptions.allowCredentials = true
			mockConfig.corsAllowCredentials = true;
			const service1 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service1['defaultOptions']?.allowCredentials).toBe(true);

			// Test 2: corsAllowCredentials = false → defaultOptions.allowCredentials = false
			mockConfig.corsAllowCredentials = false;
			const service2 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service2['defaultOptions']?.allowCredentials).toBe(false);
		});

		it('should throw error when wildcard used with allowCredentials true', () => {
			// Test: corsOrigin = '*', corsAllowCredentials = true
			mockConfig.corsOrigin = '*';
			mockConfig.corsAllowCredentials = true;

			// Expected: throws error with message about wildcard + credentials
			expect(() => new DynamicCredentialCorsService(mockCorsService, mockConfig)).toThrow(
				'N8N_DYNAMIC_CREDENTIALS_CORS_ORIGIN cannot use wildcard (*) when ' +
					'N8N_DYNAMIC_CREDENTIALS_CORS_ALLOW_CREDENTIALS is true. Specify explicit origins instead.',
			);
		});

		it('should allow wildcard when allowCredentials is false', () => {
			// Test: corsOrigin = '*', corsAllowCredentials = false
			mockConfig.corsOrigin = '*';
			mockConfig.corsAllowCredentials = false;

			// Expected: no error, defaultOptions set with wildcard
			const service = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			expect(service['defaultOptions']?.allowedOrigins).toEqual(['*']);
			expect(service['defaultOptions']?.allowCredentials).toBe(false);
		});
	});

	describe('preflightHandler()', () => {
		it('should return 204 when CORS enabled and origin allowed, 404 otherwise', () => {
			// Test 1: CORS disabled (corsOrigin="") → 404
			mockConfig.corsOrigin = '';
			const service1 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			service1.preflightHandler(mockRequest as Request, mockResponse as Response, [
				'post',
				'options',
			]);
			expect(statusSpy).toHaveBeenCalledWith(404);
			expect(endSpy).toHaveBeenCalled();

			// Test 2: CORS enabled, origin not allowed → 404
			jest.clearAllMocks();
			mockConfig.corsOrigin = 'https://app.com';
			mockCorsService.applyCorsHeaders.mockReturnValue(false);
			const service2 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			service2.preflightHandler(mockRequest as Request, mockResponse as Response, [
				'post',
				'options',
			]);
			expect(statusSpy).toHaveBeenCalledWith(404);
			expect(endSpy).toHaveBeenCalled();

			// Test 3: CORS enabled, origin allowed → 204
			jest.clearAllMocks();
			mockConfig.corsOrigin = 'https://app.com';
			mockCorsService.applyCorsHeaders.mockReturnValue(true);
			const service3 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			service3.preflightHandler(mockRequest as Request, mockResponse as Response, [
				'post',
				'options',
			]);
			expect(statusSpy).toHaveBeenCalledWith(204);
			expect(endSpy).toHaveBeenCalled();
		});

		it('should pass allowedMethods to CORS service', () => {
			// Test: call with ['post', 'options']
			mockConfig.corsOrigin = 'https://app.com';
			mockConfig.corsAllowCredentials = true;
			mockCorsService.applyCorsHeaders.mockReturnValue(true);

			const service = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			service.preflightHandler(mockRequest as Request, mockResponse as Response, [
				'post',
				'options',
			]);

			// Verify: corsService.applyCorsHeaders called with allowedMethods
			expect(mockCorsService.applyCorsHeaders).toHaveBeenCalledWith(mockRequest, mockResponse, {
				allowedOrigins: ['https://app.com'],
				allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
				allowCredentials: true,
				allowedMethods: ['post', 'options'],
			});
		});
	});

	describe('applyCorsHeadersIfEnabled()', () => {
		it('should return false when CORS disabled or origin not allowed', () => {
			// Test 1: CORS disabled → returns false, corsService not called
			mockConfig.corsOrigin = '';
			const service1 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			const result1 = service1.applyCorsHeadersIfEnabled(
				mockRequest as Request,
				mockResponse as Response,
				['get', 'options'],
			);
			expect(result1).toBe(false);
			expect(mockCorsService.applyCorsHeaders).not.toHaveBeenCalled();

			// Test 2: origin not allowed → corsService returns false, method returns false
			jest.clearAllMocks();
			mockConfig.corsOrigin = 'https://app.com';
			mockCorsService.applyCorsHeaders.mockReturnValue(false);
			const service2 = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			const result2 = service2.applyCorsHeadersIfEnabled(
				mockRequest as Request,
				mockResponse as Response,
				['get', 'options'],
			);
			expect(result2).toBe(false);
			expect(mockCorsService.applyCorsHeaders).toHaveBeenCalled();
		});

		it('should return true and merge options when origin allowed', () => {
			// Test: CORS enabled, origin allowed, allowedMethods=['get', 'options']
			mockConfig.corsOrigin = 'https://app.com';
			mockConfig.corsAllowCredentials = true;
			mockCorsService.applyCorsHeaders.mockReturnValue(true);

			const service = new DynamicCredentialCorsService(mockCorsService, mockConfig);
			const result = service.applyCorsHeadersIfEnabled(
				mockRequest as Request,
				mockResponse as Response,
				['get', 'options'],
			);

			// Verify: corsService called with merged options (defaultOptions + allowedMethods)
			expect(mockCorsService.applyCorsHeaders).toHaveBeenCalledWith(mockRequest, mockResponse, {
				allowedOrigins: ['https://app.com'],
				allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
				allowCredentials: true,
				allowedMethods: ['get', 'options'],
			});
			// returns true
			expect(result).toBe(true);
		});
	});
});
