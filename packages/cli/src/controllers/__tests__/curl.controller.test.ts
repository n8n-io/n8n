import type { Request } from 'express';
import { mock } from 'jest-mock-extended';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CurlController } from '@/controllers/curl.controller';
import type { CurlService } from '@/services/curl.service';

describe('CurlController', () => {
	const service = mock<CurlService>();
	const controller = new CurlController(service);

	beforeEach(() => jest.clearAllMocks());

	describe('toJson', () => {
		it('should throw BadRequestError when invalid cURL command is provided', () => {
			const req = mock<Request>();
			service.toHttpNodeParameters.mockImplementation(() => {
				throw new Error();
			});

			expect(() => controller.toJson(req)).toThrow(BadRequestError);
		});

		it('should return flattened parameters when valid cURL command is provided', () => {
			const curlCommand = 'curl -v -X GET https://test.n8n.berlin/users';
			const req = mock<Request>();
			req.body = { curlCommand };
			service.toHttpNodeParameters.mockReturnValue({
				url: 'https://test.n8n.berlin/users',
				authentication: 'none',
				method: 'GET',
				sendHeaders: false,
				sendQuery: false,
				options: {
					redirect: { redirect: {} },
					response: { response: {} },
				},
				sendBody: false,
			});

			const result = controller.toJson(req);
			expect(result).toEqual({
				'parameters.method': 'GET',
				'parameters.url': 'https://test.n8n.berlin/users',
				'parameters.authentication': 'none',
				'parameters.sendBody': false,
				'parameters.sendHeaders': false,
				'parameters.sendQuery': false,
			});
		});
	});
});
