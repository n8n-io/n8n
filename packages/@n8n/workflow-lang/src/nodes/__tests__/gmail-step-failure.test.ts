/**
 * A Gmail request whose step fails outside the node: the runtime gives the node the error of
 * n8n when n8n does not renew the OAuth2 token (no refresh token). The item loop of the v1
 * node (GmailV2.node.ts) adds ` (item N)` to the message of every error, so the library node
 * does too. v1 gives no description and no HTTP code for this error.
 */
import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';

const REFUSED =
	'OAuth access token expired and no refresh token is available. Please reconnect the credentials.';

const source = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'gmail' })],
	credentials: { c: { type: 'gmailOAuth2' } },
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.2,
			parameters: { operation: 'delete', messageId: 'm10' },
			credential: 'c',
		});
	},
});
`;

describe('Gmail library node: a step that fails outside the node', () => {
	it('adds the item index to the error of a renewal that n8n refused', async () => {
		const fixture = {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Node: [{ $error: REFUSED }] },
		};
		const compiled = compile(source);
		expect(compiled.diagnostics).toEqual([]);
		const reference = await runReference(source, fixture);
		expect(reference.status).toBe('error');
		expect(reference.result).toMatchObject({ message: `${REFUSED} (item 0)` });
		expect(reference.result).not.toHaveProperty('description');
		expect(reference.result).not.toHaveProperty('httpCode');
		const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
		expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	});

	it('gives the second 401 answer to the node, after a renewal with a refresh token', async () => {
		// The runtime sends the request again once with the new token (renew.zig). The answer of
		// that request reaches the node, as the second answer reaches the v1 node.
		const fixture = {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: {
				Node: [{ status: 401, headers: {}, body: { error: { code: 401, message: 'Invalid' } } }],
			},
		};
		const reference = await runReference(source, fixture);
		expect(reference.status).toBe('error');
		expect(reference.result).toMatchObject({
			message: 'Authorization failed - please check your credentials (item 0)',
			description: 'Invalid',
		});
		expect(reference.result).not.toHaveProperty('httpCode');
	});
});
