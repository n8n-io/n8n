import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import {
	describeGraphError,
	graphErrorCode,
	graphErrorMessage,
	graphInnerErrorCode,
	TeamsGraphService,
} from '../teams-graph.service';

describe('TeamsGraphService', () => {
	let request: ReturnType<typeof vi.fn>;
	let service: TeamsGraphService;

	/** The single request the service made, as the HTTP client saw it. */
	const sent = () => request.mock.calls[0][0] as Record<string, unknown>;

	beforeEach(() => {
		request = vi.fn().mockResolvedValue({ statusCode: 200, body: { id: 'app-1' } });
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock({ request }) as never);
		service = new TeamsGraphService(outboundHttp, mock<Logger>());
	});

	describe('request', () => {
		it('signs the call and sends JSON', async () => {
			await service.request('a-token', 'POST', '/applications', { displayName: 'Bot' });

			expect(sent()).toMatchObject({
				method: 'POST',
				url: 'https://graph.microsoft.com/v1.0/applications',
				headers: expect.objectContaining({
					authorization: 'Bearer a-token',
					'content-type': 'application/json',
				}),
				body: '{"displayName":"Bot"}',
			});
		});

		it('sends no body when there is none, rather than the string "undefined"', async () => {
			await service.request('a-token', 'GET', '/organization');

			expect(sent().body).toBeUndefined();
		});

		/** A few Graph calls are gated behind a header, such as `create-if-missing`. */
		it('adds the caller’s own headers', async () => {
			await service.request(
				'a-token',
				'PATCH',
				"/applications(uniqueName='x')",
				{},
				{
					Prefer: 'create-if-missing',
				},
			);

			expect(sent().headers).toMatchObject({ Prefer: 'create-if-missing' });
		});

		it.each([
			[200, true],
			[204, true],
			[299, true],
			[300, false],
			[403, false],
			[500, false],
		])('reports %i as ok=%s', async (statusCode, ok) => {
			request.mockResolvedValue({ statusCode, body: {} });

			await expect(service.request('a-token', 'GET', '/organization')).resolves.toMatchObject({
				statusCode,
				ok,
			});
		});

		/**
		 * The flow branches on what Graph refuses, so a refusal is handed back
		 * rather than thrown: a 403 on the publish call is how a user without the
		 * Teams administrator role is recognised.
		 */
		it('hands a refusal back instead of throwing', async () => {
			request.mockResolvedValue({ statusCode: 403, body: { error: { code: 'Forbidden' } } });

			await expect(service.request('a-token', 'GET', '/organization')).resolves.toMatchObject({
				ok: false,
				body: { error: { code: 'Forbidden' } },
			});
		});

		/**
		 * The path is concatenated onto the host, so a value that re-points the
		 * URL would send Microsoft's bearer token somewhere else.
		 */
		it.each(['@elsewhere.example/', '/../../elsewhere'])(
			'refuses to send the token off Graph for %s',
			async (path) => {
				await expect(service.request('a-token', 'GET', path)).rejects.toThrow(/Refusing/);
				expect(request).not.toHaveBeenCalled();
			},
		);
	});

	describe('error parsers', () => {
		const refusal = {
			error: {
				code: 'BadRequest',
				message: 'The app manifest is not valid.',
				innerError: { code: 'UnableToParseTeamsAppManifest' },
			},
		};

		it('reads the outer code, the message and the inner code', () => {
			expect(graphErrorCode(refusal)).toBe('BadRequest');
			expect(graphErrorMessage(refusal)).toBe('The app manifest is not valid.');
			expect(graphInnerErrorCode(refusal)).toBe('UnableToParseTeamsAppManifest');
		});

		/** The outer code is generic for a rejected package; the inner one names the fault. */
		it('prefers the inner code when describing a refusal', () => {
			expect(describeGraphError(refusal)).toBe(
				'UnableToParseTeamsAppManifest: The app manifest is not valid.',
			);
		});

		it('falls back to the outer code when there is no inner one', () => {
			expect(describeGraphError({ error: { code: 'Forbidden', message: 'No.' } })).toBe(
				'Forbidden: No.',
			);
		});

		it.each([undefined, null, 'a string', {}, { error: 'not an object' }])(
			'says nothing about %s',
			(body) => {
				expect(graphErrorCode(body)).toBeUndefined();
				expect(graphErrorMessage(body)).toBeUndefined();
				expect(graphInnerErrorCode(body)).toBeUndefined();
				expect(describeGraphError(body)).toBeUndefined();
			},
		);
	});
});
