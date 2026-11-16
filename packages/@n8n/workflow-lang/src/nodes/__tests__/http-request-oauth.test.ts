/**
 * An expired OAuth2 token of the library HTTP Request node. The runtime renews the token and
 * sends the request again once (`workflow-runtime/src/shell/renew.zig`), so the node has no
 * code for it: one renewal and one resend, as v1.
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
	it('leaves the renewal of an expired token to the runtime: one request, no service call', async () => {
		const out = await runHttp('oAuth2Api', [expired]);
		expect(out.status).toBe('error');
		expect(out.effects.map((effect) => effect.kind)).toEqual(['http']);
	});

	it('gives the response after the renewal of the runtime as the result', async () => {
		const out = await runHttp('oAuth2Api', [ok]);
		expect(out.status).toBe('ok');
		expect(out.effects.map((effect) => effect.kind)).toEqual(['http']);
		expect(out.result).toEqual({ H: [{ ok: true }] });
	});

	it('gives the status of the v1 node that means "the token expired" with the request', async () => {
		const own = await runHttp('goToWebinarOAuth2Api', [ok]);
		expect(own.effects[0].args).toMatchObject({ tokenExpiredStatusCode: 403 });
		const other = await runHttp('oAuth2Api', [ok]);
		expect(Reflect.get(Object(other.effects[0].args), 'tokenExpiredStatusCode')).toBeUndefined();
	});
});
