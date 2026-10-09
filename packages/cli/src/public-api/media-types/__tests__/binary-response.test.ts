import type { BinaryResponse } from '@n8n/decorators';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { sendBinaryResponse } from '../binary-response';

/** A response mock whose `status` returns the response, as Express does. */
function mockResponse() {
	const res = mock<Response>();
	res.status.mockReturnValue(res);
	return res;
}

describe('sendBinaryResponse', () => {
	const binaryResponse: BinaryResponse = {
		mediaType: 'application/gzip',
		headers: { 'X-Required': { description: 'Must be set.' } },
	};

	it('rejects a result that is missing a declared header, before the response is touched', async () => {
		const res = mockResponse();

		await expect(
			sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', { body: Buffer.from('x') }),
		).rejects.toThrow('Widgets.method did not set the declared response header(s): X-Required');

		expect(res.status).not.toHaveBeenCalled();
		expect(res.setHeader).not.toHaveBeenCalled();
	});

	it('matches a declared header name case-insensitively', async () => {
		const res = mockResponse();

		await sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', {
			body: Buffer.from('x'),
			headers: { 'x-required': '1' },
		});

		expect(res.end).toHaveBeenCalledWith(Buffer.from('x'));
	});

	it('rejects a result without a binary body', async () => {
		const res = mockResponse();

		await expect(
			sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', {
				body: 'not binary',
				headers: { 'X-Required': '1' },
			}),
		).rejects.toThrow('Widgets.method declares a binary @ApiResponse but returned no body');

		expect(res.status).not.toHaveBeenCalled();
	});
});
