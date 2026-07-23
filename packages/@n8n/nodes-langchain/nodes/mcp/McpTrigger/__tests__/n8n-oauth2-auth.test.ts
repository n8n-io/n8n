import type { IWebhookFunctions, N8nOAuth2ValidationResult } from 'n8n-workflow';

import { createMockRequest, createMockResponse } from './helpers';
import { n8nOAuth2Auth } from '../n8n-oauth2-auth';

const buildContext = (validation: N8nOAuth2ValidationResult) => {
	const response = createMockResponse();
	const request = createMockRequest({ headers: { authorization: 'Bearer test-token' } });

	const context = {
		getNodeWebhookUrl: () => 'https://n8n.example.com/mcp/protected-path',
		getResponseObject: () => response,
		getRequestObject: () => request,
		validateN8nOAuth2Token: vi.fn().mockResolvedValue(validation),
	} as unknown as IWebhookFunctions;

	return { context, response };
};

describe('n8nOAuth2Auth', () => {
	// An authenticated user lacking execute access (`insufficient_scope`) is rejected with 403;
	// an unverifiable token (`invalid_token`) with 401. Both carry the reason in WWW-Authenticate.
	test.each([
		['insufficient_scope', 403],
		['invalid_token', 401],
	] as const)('maps a %s validation failure to a %i response', async (reason, code) => {
		const { context, response } = buildContext({ valid: false, reason });

		const result = await n8nOAuth2Auth(context);

		expect(result).toBe('handled');
		expect(response.writeHead).toHaveBeenCalledWith(code, {
			'WWW-Authenticate': expect.stringContaining(`error="${reason}"`),
		});
	});
});
