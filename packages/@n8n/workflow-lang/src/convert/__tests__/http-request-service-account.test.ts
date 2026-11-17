/**
 * HTTP Request with a Google service account (`googleApi` as a predefined credential type).
 * `GoogleApi.authenticate` of v1 adds `Authorization: Bearer <token>` after the headers of the
 * node, when the credential is set up for the HTTP Request node. n8n makes the token (a
 * credential mint), and the library node sends it.
 */
import { compile } from '../../compiler/index.ts';
import type { NodeSources } from '../../node-compile/convert.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import { GOOGLE_HTTP_MINT } from '../library.ts';

function workflow(parameters: Record<string, unknown>) {
	return {
		name: 'Flow',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [200, 0],
				parameters: {
					url: 'https://www.googleapis.com/x',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googleApi',
					options: {},
					...parameters,
				},
				credentials: { googleApi: { id: 'c1', name: 'Robot' } },
			},
		],
		connections: { Hook: { main: [[{ node: 'Request', type: 'main', index: 0 }]] } },
	};
}

const sources = (httpNode: boolean | undefined): NodeSources => ({
	entry: () => undefined,
	readFile: () => undefined,
	description: () => undefined,
	verified: {},
	publicCredential: (type) =>
		type === 'googleApi' && httpNode !== undefined
			? { fields: { httpNode }, classes: [`@googleApi.httpNode=${httpNode}`] }
			: undefined,
});

const headers = (rows: Array<{ name: string; value: string }>) => ({
	sendHeaders: true,
	headerParameters: { parameters: rows },
});

const TOKEN = `Bearer {{$credentials.n8nMinted.${GOOGLE_HTTP_MINT.name}.access_token}}`;

describe('HTTP Request with a Google service account in the converter', () => {
	it('links the library node, asks for the token, and sends it after the headers of the node', async () => {
		const out = convertWorkflow(workflow(headers([{ name: 'X-Trace', value: 'a' }])), {
			nodeSources: sources(true),
		});
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.fallbackNodes).toEqual([]);
		expect(out.credentialMints).toEqual({ robot: [GOOGLE_HTTP_MINT] });

		const run = await runReference(out.source, {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Request: [{ status: 200, headers: {}, body: { ok: true } }] },
		});
		expect(run.status).toBe('ok');
		const args = run.effects[0].args as { headers: Record<string, string>; credential: string };
		expect(Object.entries(args.headers).filter(([name]) => name !== 'accept')).toEqual([
			['X-Trace', 'a'],
			['Authorization', TOKEN],
		]);
		expect(args.credential).toBe('robot');
	});

	it('sends the token with a request that has no headers', () => {
		const out = convertWorkflow(workflow({}), { nodeSources: sources(true) });
		expect(out.fallbackNodes).toEqual([]);
		expect(out.source).toContain(`withBearer({}, '${TOKEN}')`);
	});

	it('runs in the host when the credential is not set up for the HTTP Request node', () => {
		for (const httpNode of [false, undefined]) {
			const out = convertWorkflow(workflow({}), { nodeSources: sources(httpNode) });
			expect(out.ok).toBe(true);
			expect(out.fallbackNodes).toEqual(['Request']);
			expect(out.credentialMints).toBeUndefined();
		}
	});

	it('runs in the host without the public fields of the credential', () => {
		const out = convertWorkflow(workflow({}));
		expect(out.fallbackNodes).toEqual(['Request']);
	});

	it('runs in the host when a header of the node can be the authorization header', () => {
		for (const parameters of [
			headers([{ name: 'authorization', value: 'x' }]),
			headers([{ name: 'Authorization', value: 'x' }]),
			headers([{ name: '={{ $json.name }}', value: 'x' }]),
			{ sendHeaders: true, specifyHeaders: 'json', jsonHeaders: '{"a":"b"}' },
			{
				options: {
					pagination: {
						pagination: {
							parameters: {
								parameters: [
									{ type: 'headers', name: 'AUTHORIZATION', value: '={{ $pageCount }}' },
								],
							},
							paginationCompleteWhen: 'responseIsEmpty',
						},
					},
				},
			},
		]) {
			const out = convertWorkflow(workflow(parameters), { nodeSources: sources(true) });
			expect(out.fallbackNodes).toEqual(['Request']);
			expect(out.credentialMints).toBeUndefined();
		}
	});
});
