import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';

import { armNextLinkPath, TeamsArmService } from '../teams-arm.service';

describe('TeamsArmService', () => {
	let request: ReturnType<typeof vi.fn>;
	let service: TeamsArmService;

	const sent = () => request.mock.calls[0][0] as Record<string, unknown>;

	beforeEach(() => {
		request = vi.fn().mockResolvedValue({ statusCode: 200, body: { value: [] } });
		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock({ request }) as never);
		service = new TeamsArmService(outboundHttp, mock<Logger>());
	});

	it('signs the call and sends JSON', async () => {
		await service.request('a-token', 'PUT', '/subscriptions/sub-1/x', { location: 'global' });

		expect(sent()).toMatchObject({
			method: 'PUT',
			url: 'https://management.azure.com/subscriptions/sub-1/x',
			headers: expect.objectContaining({ authorization: 'Bearer a-token' }),
			body: '{"location":"global"}',
		});
	});

	it.each([
		[200, true],
		[404, false],
		[403, false],
	])('reports %i as ok=%s', async (statusCode, ok) => {
		request.mockResolvedValue({ statusCode, body: {} });

		await expect(service.request('a-token', 'GET', '/subscriptions')).resolves.toMatchObject({
			statusCode,
			ok,
		});
	});

	/**
	 * The path is concatenated onto the host, so a value carrying userinfo moves
	 * the whole request — and with it Azure's bearer token — to another host.
	 */
	it('refuses to send the token off Azure Resource Manager', async () => {
		await expect(
			service.request('a-token', 'GET', '@elsewhere.example/subscriptions'),
		).rejects.toThrow(/Refusing/);
		expect(request).not.toHaveBeenCalled();
	});

	describe('armNextLinkPath', () => {
		it('reduces an ARM link to the path the client takes', () => {
			expect(armNextLinkPath('https://management.azure.com/subscriptions?skipToken=abc')).toBe(
				'/subscriptions?skipToken=abc',
			);
		});

		it.each([
			'https://elsewhere.example/subscriptions',
			'http://management.azure.com/subscriptions',
			'not a url',
		])('drops %s', (link) => {
			expect(armNextLinkPath(link)).toBeUndefined();
		});
	});
});
