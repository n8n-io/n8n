import fc from 'fast-check';

import {
	buildTransferPreflight,
	matchCredentials,
	missingNodeTypes,
	type RemoteCredentialList,
} from '../transfer-preflight';

// Few names and types, so that lists often share and repeat credentials.
const credentialArb = fc.record({
	name: fc.constantFrom('Slack', 'slack', 'Stripe', 'a|b', 'a', ''),
	type: fc.constantFrom('slackApi', 'httpHeaderAuth', 'c', 'b|c'),
});

const remoteListArb: fc.Arbitrary<RemoteCredentialList | null> = fc.option(
	fc.record({
		credentials: fc.array(credentialArb, { maxLength: 8 }),
		complete: fc.boolean(),
	}),
	{ nil: null },
);

const nodeTypeArb = fc.constantFrom('a@1', 'a@2', 'b@1', 'c@1.1');

const key = ({ name, type }: { name: string; type: string }) => JSON.stringify([name, type]);

describe('transfer preflight properties', () => {
	it('lists every local credential exactly once, with a status', () => {
		fc.assert(
			fc.property(fc.array(credentialArb, { maxLength: 10 }), remoteListArb, (local, remote) => {
				const result = matchCredentials(local, remote);

				const keys = result.map(key);
				expect(new Set(keys).size).toBe(keys.length);
				expect(new Set(keys)).toEqual(new Set(local.map(key)));
				for (const credential of result) {
					expect(['matched', 'needs-set-up', 'unknown']).toContain(credential.status);
				}
			}),
		);
	});

	it('gives matched exactly to the credentials that the instance listed by name and type', () => {
		fc.assert(
			fc.property(fc.array(credentialArb, { maxLength: 10 }), remoteListArb, (local, remote) => {
				const listed = new Set((remote?.credentials ?? []).map(key));

				for (const credential of matchCredentials(local, remote)) {
					const isListed = remote !== null && listed.has(key(credential));
					expect(credential.status === 'matched').toBe(isListed);
				}
			}),
		);
	});

	it('gives needs-set-up only when the instance sent a complete list without the credential', () => {
		fc.assert(
			fc.property(fc.array(credentialArb, { maxLength: 10 }), remoteListArb, (local, remote) => {
				const listed = new Set((remote?.credentials ?? []).map(key));

				for (const credential of matchCredentials(local, remote)) {
					const expected = remote?.complete === true && !listed.has(key(credential));
					expect(credential.status === 'needs-set-up').toBe(expected);
				}
			}),
		);
	});

	it('gives unknown to every credential when the instance did not list credentials', () => {
		fc.assert(
			fc.property(fc.array(credentialArb, { maxLength: 10 }), (local) => {
				expect(matchCredentials(local, null).every(({ status }) => status === 'unknown')).toBe(
					true,
				);
			}),
		);
	});

	it('returns credentials sorted by name, then type', () => {
		fc.assert(
			fc.property(fc.array(credentialArb, { maxLength: 10 }), remoteListArb, (local, remote) => {
				const result = matchCredentials(local, remote);

				const sorted = [...result].sort(
					(a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type),
				);
				expect(result).toEqual(sorted);
			}),
		);
	});

	it('reports as missing exactly the local node types that the instance does not list', () => {
		fc.assert(
			fc.property(
				fc.array(nodeTypeArb, { maxLength: 8 }),
				fc.option(fc.array(nodeTypeArb, { maxLength: 8 }), { nil: null }),
				(local, remote) => {
					const result = missingNodeTypes(local, remote);

					if (remote === null) {
						expect(result).toEqual([]);
						return;
					}
					const expected = [...new Set(local.filter((type) => !remote.includes(type)))].sort();
					expect(result).toEqual(expected);
				},
			),
		);
	});

	it('says unknown exactly when the instance lists no node types, and then reports none missing', () => {
		fc.assert(
			fc.property(
				fc.array(nodeTypeArb, { maxLength: 8 }),
				fc.option(fc.array(nodeTypeArb, { maxLength: 8 }), { nil: null }),
				(nodeTypes, remoteNodeTypes) => {
					const preflight = buildTransferPreflight(
						{
							workflowName: 'w',
							nodeCount: nodeTypes.length,
							nodeTypes,
							credentials: [],
							subWorkflowCalls: [],
						},
						{ nodeTypes: remoteNodeTypes, credentials: null, targetProject: null },
					);

					expect(preflight.nodeTypeCheck === 'unknown').toBe(remoteNodeTypes === null);
					if (remoteNodeTypes === null) expect(preflight.missingNodeTypes).toEqual([]);
					expect(preflight.moves.nodes).toBe(nodeTypes.length);
				},
			),
		);
	});
});
