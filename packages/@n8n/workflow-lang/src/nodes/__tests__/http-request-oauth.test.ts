/**
 * An expired OAuth2 token of the library HTTP Request node: n8n refreshes it
 * through the `credentials` service, then the request goes again once.
 */
import { convertWorkflow } from '../../convert/index.ts';
import type { HttpResponse } from '../../sdk/index.ts';
import { runReference } from '../../reference/runner.ts';

const ok: HttpResponse<unknown> = {
	status: 200,
	headers: { 'content-type': 'application/json' },
	body: { ok: true },
};

const expired: HttpResponse<unknown> = {
	status: 401,
	headers: { 'content-type': 'application/json' },
	body: { error: 'expired' },
};

/** Converts one HTTP Request node with a credential and runs it with these responses. */
async function runHttp(
	credentialType: string,
	responses: unknown[],
	withCredential = true,
): Promise<Awaited<ReturnType<typeof runReference>>> {
	const converted = convertWorkflow({
		name: 'OAuth',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [200, 0],
				parameters: {
					url: 'https://api.example.com/x',
					authentication: 'genericCredentialType',
					genericAuthType: credentialType,
					options: {},
				},
				...(withCredential
					? { credentials: { [credentialType]: { id: 'cred1', name: 'Credential' } } }
					: {}),
			},
		],
		connections: { T: { main: [[{ node: 'H', type: 'main', index: 0 }]] } },
	});
	expect(converted.ok).toBe(true);
	return await runReference(converted.source, {
		trigger: {},
		now: 0,
		seed: 1,
		effects: { H: responses },
	});
}

describe('the library HTTP Request node with an OAuth2 credential', () => {
	it('refreshes the token once and sends the request again', async () => {
		const out = await runHttp('oAuth2Api', [expired, { ok: true }, ok]);
		expect(out.status).toBe('ok');
		expect(out.effects.map((effect) => effect.kind)).toEqual(['http', 'service', 'http']);
		expect(out.effects[1].args).toEqual({
			service: 'credentials',
			op: 'refreshOAuth2',
			args: { credentialId: 'cred1' },
		});
		expect(out.result).toEqual({ H: [{ ok: true }] });
	});

	it('gives the second expired status as the error', async () => {
		const out = await runHttp('oAuth2Api', [expired, { ok: true }, expired]);
		expect(out.status).toBe('error');
		expect(out.effects.map((effect) => effect.kind)).toEqual(['http', 'service', 'http']);
	});

	it('never refreshes a credential that is not OAuth2', async () => {
		const out = await runHttp('httpHeaderAuth', [expired]);
		expect(out.status).toBe('error');
		expect(out.effects.map((effect) => effect.kind)).toEqual(['http']);
	});

	it('does not refresh without a credential id', async () => {
		const out = await runHttp('oAuth2Api', [expired], false);
		expect(out.status).toBe('error');
		expect(out.effects.map((effect) => effect.kind)).toEqual(['http']);
	});
});
