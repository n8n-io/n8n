import type { Request, Response } from 'express';

import { applyCors } from '../cors.util';

describe('applyCors', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let setHeaderSpy: jest.Mock;
	let getHeaderSpy: jest.Mock;

	beforeEach(() => {
		setHeaderSpy = jest.fn();
		getHeaderSpy = jest.fn();

		mockReq = {
			headers: {},
		};

		mockRes = {
			setHeader: setHeaderSpy,
			getHeader: getHeaderSpy,
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should not modify headers if Access-Control-Allow-Origin is already set', () => {
		getHeaderSpy.mockReturnValue('https://example.com');
		mockReq.headers = { origin: 'https://test.com' };

		applyCors(mockReq as Request, mockRes as Response);

		expect(getHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin');
		expect(setHeaderSpy).not.toHaveBeenCalled();
	});

	it('should set Access-Control-Allow-Origin to * when origin is undefined', () => {
		getHeaderSpy.mockReturnValue(undefined);
		mockReq.headers = {};

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		expect(setHeaderSpy).toHaveBeenCalledTimes(3);
	});

	it('should set Access-Control-Allow-Origin to * when origin is "null"', () => {
		getHeaderSpy.mockReturnValue(undefined);
		mockReq.headers = { origin: 'null' };

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		expect(setHeaderSpy).toHaveBeenCalledTimes(3);
	});

	it('should set Access-Control-Allow-Origin to the request origin when origin is provided', () => {
		getHeaderSpy.mockReturnValue(undefined);
		const origin = 'https://example.com';
		mockReq.headers = { origin };

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		expect(setHeaderSpy).toHaveBeenCalledTimes(3);
	});

	it('should set Access-Control-Allow-Origin to the request origin with localhost', () => {
		getHeaderSpy.mockReturnValue(undefined);
		const origin = 'http://localhost:3000';
		mockReq.headers = { origin };

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		expect(setHeaderSpy).toHaveBeenCalledTimes(3);
	});

	it('should set Access-Control-Allow-Origin to the request origin with custom port', () => {
		getHeaderSpy.mockReturnValue(undefined);
		const origin = 'https://app.example.com:8080';
		mockReq.headers = { origin };

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		expect(setHeaderSpy).toHaveBeenCalledTimes(3);
	});

	it('should handle IP address as origin', () => {
		getHeaderSpy.mockReturnValue(undefined);
		const origin = 'http://192.168.1.1:5000';
		mockReq.headers = { origin };

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', origin);
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
		expect(setHeaderSpy).toHaveBeenCalledTimes(3);
	});

	it('should always set Allow-Methods and Allow-Headers when origin is present', () => {
		getHeaderSpy.mockReturnValue(undefined);
		const origin = 'https://trusted-domain.com';
		mockReq.headers = { origin };

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
	});

	it('should always set Allow-Methods and Allow-Headers when origin is not present', () => {
		getHeaderSpy.mockReturnValue(undefined);
		mockReq.headers = {};

		applyCors(mockReq as Request, mockRes as Response);

		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type');
	});
});
