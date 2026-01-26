import type { Request, Response } from 'express';

import { CorsService } from '../cors-service';

describe('CorsService', () => {
	let corsService: CorsService;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let headerSpy: jest.Mock;

	beforeEach(() => {
		corsService = new CorsService();
		headerSpy = jest.fn();

		mockRequest = {
			headers: {},
		};

		mockResponse = {
			header: headerSpy,
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('applyCorsHeaders()', () => {
		it('should return false when no origin header present or origin not allowed', () => {
			// Test 1: req.headers.origin = undefined → returns false
			const result1 = corsService.applyCorsHeaders(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(result1).toBe(false);
			expect(headerSpy).not.toHaveBeenCalled();

			// Test 2: origin='https://evil.com', allowedOrigins=['https://app.com'] → returns false
			mockRequest.headers = { origin: 'https://evil.com' };
			const result2 = corsService.applyCorsHeaders(
				mockRequest as Request,
				mockResponse as Response,
				{ allowedOrigins: ['https://app.com'] },
			);

			expect(result2).toBe(false);
			expect(headerSpy).not.toHaveBeenCalled();
		});

		it('should allow origin when in allowed list or wildcard present', () => {
			// Test 1: origin='https://app.com', allowedOrigins=['https://app.com'] → true
			mockRequest.headers = { origin: 'https://app.com' };
			const result1 = corsService.applyCorsHeaders(
				mockRequest as Request,
				mockResponse as Response,
				{ allowedOrigins: ['https://app.com'] },
			);

			expect(result1).toBe(true);
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.com');

			// Reset for next test
			jest.clearAllMocks();

			// Test 2: origin='https://anything.com', allowedOrigins=['*'] → true
			mockRequest.headers = { origin: 'https://anything.com' };
			const result2 = corsService.applyCorsHeaders(
				mockRequest as Request,
				mockResponse as Response,
				{ allowedOrigins: ['*'] },
			);

			expect(result2).toBe(true);
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://anything.com');
		});

		it('should set all CORS headers correctly when origin is allowed', () => {
			mockRequest.headers = { origin: 'https://app.com' };

			const result = corsService.applyCorsHeaders(
				mockRequest as Request,
				mockResponse as Response,
				{
					allowedOrigins: ['https://app.com'],
					allowedMethods: ['get', 'post'],
					allowedHeaders: ['Content-Type', 'Authorization'],
					maxAge: 86400,
				},
			);

			expect(result).toBe(true);
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.com');
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST');
			expect(headerSpy).toHaveBeenCalledWith(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization',
			);
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
		});

		it('should set Access-Control-Allow-Credentials when explicitly provided', () => {
			mockRequest.headers = { origin: 'https://app.com' };

			// Test 1: allowCredentials=true → header 'true'
			corsService.applyCorsHeaders(mockRequest as Request, mockResponse as Response, {
				allowedOrigins: ['https://app.com'],
				allowCredentials: true,
			});

			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');

			// Reset for next test
			jest.clearAllMocks();

			// Test 2: allowCredentials=false → header 'false'
			corsService.applyCorsHeaders(mockRequest as Request, mockResponse as Response, {
				allowedOrigins: ['https://app.com'],
				allowCredentials: false,
			});

			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'false');

			// Reset for next test
			jest.clearAllMocks();

			// Test 3: allowCredentials=undefined → header not set
			corsService.applyCorsHeaders(mockRequest as Request, mockResponse as Response, {
				allowedOrigins: ['https://app.com'],
			});

			const hasCredentialsHeader = headerSpy.mock.calls.some(
				(call: string[]) => call[0] === 'Access-Control-Allow-Credentials',
			);
			expect(hasCredentialsHeader).toBe(false);
		});

		it('should merge custom options with defaults', () => {
			mockRequest.headers = { origin: 'https://app.com' };

			const result = corsService.applyCorsHeaders(
				mockRequest as Request,
				mockResponse as Response,
				{ allowedOrigins: ['https://app.com'] },
			);

			expect(result).toBe(true);

			// Verify custom origin is used
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.com');

			// Verify default methods are used (uppercase)
			expect(headerSpy).toHaveBeenCalledWith(
				'Access-Control-Allow-Methods',
				'GET, POST, OPTIONS, PUT, PATCH, DELETE',
			);

			// Verify default headers are used
			expect(headerSpy).toHaveBeenCalledWith(
				'Access-Control-Allow-Headers',
				'Origin, X-Requested-With, Content-Type, Accept',
			);

			// Verify default maxAge is used
			expect(headerSpy).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
		});
	});
});
