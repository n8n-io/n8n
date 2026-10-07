import fc from 'fast-check';
import { inspect } from 'node:util';

import type { RemoteInstanceClient } from '../remote-instance.client';
import { ClientHarness, createRemote } from './remote-instance.test-helpers';

// The client accepts visible ASCII only, so the tokens use that set.
const tokenArb = fc.stringMatching(/^[\x21-\x7E]{20,200}$/);

/** Each way that code can turn the client into text by mistake: a log line, a debug dump, a JSON body. */
function serialisations(client: RemoteInstanceClient): string[] {
	return [
		JSON.stringify(client),
		inspect(client, { depth: 5 }),
		inspect(client, { depth: 5, showHidden: true }),
		JSON.stringify(Object.values(client)),
		inspect(
			Reflect.ownKeys(client).map((key) => Reflect.get(client, key)),
			{ depth: 5 },
		),
	];
}

describe('RemoteInstanceClient token privacy', () => {
	let harness: ClientHarness;

	beforeEach(() => {
		harness = new ClientHarness();
	});

	afterEach(async () => await harness.dispose());

	it('no serialisation of a new client holds the token', () => {
		fc.assert(
			fc.property(tokenArb, (token) => {
				const client = harness.createClient({ token });

				for (const text of serialisations(client)) {
					expect(text).not.toContain(token);
				}
			}),
		);
	});

	it('no serialisation holds the token after a probe and a tool call', async () => {
		await fc.assert(
			fc.asyncProperty(tokenArb, async (token) => {
				const remote = createRemote(token);
				harness.useTransportFetch(remote.fetch);
				const client = harness.createClient({ token });

				expect(await client.probe()).toMatchObject({ ok: true });
				expect(await client.callTool('greet', {})).toBe('Hello there');

				for (const text of serialisations(client)) {
					expect(text).not.toContain(token);
				}
			}),
			{ numRuns: 20 },
		);
	});
});
