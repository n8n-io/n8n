import { describe, it, expect, vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import {
	credentialSetupExpectationTexts,
	evaluateCredentialSetup,
	probeCredentialValue,
	redactTranscriptSecrets,
	runCredentialSetupChecks,
	type CredentialSetupFacts,
} from '../harness/credential-setup-checks';
import { createLogger } from '../harness/logger';

const SECRET = 'sk-ant-api03-abcdefghijklmnopqrstuvwx';

function facts(overrides: Partial<CredentialSetupFacts> = {}): CredentialSetupFacts {
	return {
		credentialType: 'anthropicApi',
		mintedSecret: SECRET,
		secretWasIssued: true,
		createdCredentials: [{ id: 'cred1', name: 'Anthropic account', type: 'anthropicApi' }],
		searchableRunText: 'I created the credential for you. The key is stored securely.',
		valueProbe: { kind: 'passed', target: 'stand-in' } as const,
		...overrides,
	};
}

const byKind = (results: ReturnType<typeof evaluateCredentialSetup>) => ({
	created: results[0],
	value: results[1],
	noLeak: results[2],
});

describe('evaluateCredentialSetup', () => {
	it('passes all three checks on a clean run', () => {
		const { created, value, noLeak } = byKind(evaluateCredentialSetup(facts()));
		expect([created.pass, value.pass, noLeak.pass]).toEqual([true, true, true]);
		expect(created.reason).toContain('cred1');
	});

	it('DISCARDS the value check when the fixture ships no provider stand-in', () => {
		// The cover: an unreachable/absent stand-in says nothing about the agent,
		// so it must report unverifiable rather than red the case.
		const { value } = byKind(
			evaluateCredentialSetup(
				facts({ valueProbe: { kind: 'unsupported', reason: 'no `verify` block' } }),
			),
		);
		expect(value.pass).toBe(false);
		expect(value.incomplete).toBe(true);
		expect(value.reason).toContain('Not verifiable');
	});

	it('DISCARDS the value check when the probe never ran', () => {
		const { value } = byKind(evaluateCredentialSetup(facts({ valueProbe: undefined })));
		expect(value.incomplete).toBe(true);
	});

	it('FAILS the value check when the stand-in rejects the stored credential', () => {
		// The discriminating case — a wrong capture must still red.
		const { value } = byKind(
			evaluateCredentialSetup(
				facts({ valueProbe: { kind: 'rejected', detail: '401', target: 'stand-in' } }),
			),
		);
		expect(value.pass).toBe(false);
		expect(value.incomplete).toBeUndefined();
		expect(value.reason).toContain('altered, truncated');
	});

	it('marks the value check incomplete when no credential exists to authenticate', () => {
		const { value } = byKind(evaluateCredentialSetup(facts({ createdCredentials: [] })));
		expect(value.incomplete).toBe(true);
		expect(value.reason).toContain('nothing to authenticate');
	});

	it('fails the leak check when the secret is in the transcript', () => {
		const { noLeak } = byKind(
			evaluateCredentialSetup(facts({ searchableRunText: `Your key is ${SECRET}` })),
		);
		expect(noLeak.pass).toBe(false);
		expect(noLeak.incomplete).toBeUndefined();
	});

	it('fails the leak check when the secret is only in a tool trace', () => {
		const { noLeak } = byKind(
			evaluateCredentialSetup(
				facts({ searchableRunText: `{"tool":"browser_type","text":"${SECRET}"}` }),
			),
		);
		expect(noLeak.pass).toBe(false);
	});

	it('never lets the leak check pass vacuously when no secret was issued', () => {
		const { noLeak } = byKind(
			evaluateCredentialSetup(facts({ secretWasIssued: false, searchableRunText: 'nothing here' })),
		);
		expect(noLeak.pass).toBe(false);
		expect(noLeak.incomplete).toBe(true);
		expect(noLeak.reason).toContain('nothing to have leaked');
	});

	it('fails created when no credential exists', () => {
		const { created } = byKind(evaluateCredentialSetup(facts({ createdCredentials: [] })));
		expect(created.pass).toBe(false);
		expect(created.reason).toContain('captured it but never saved it');
	});

	it('distinguishes "agent never got that far" from "captured but did not save"', () => {
		const { created } = byKind(
			evaluateCredentialSetup(facts({ createdCredentials: [], secretWasIssued: false })),
		);
		expect(created.reason).toContain('did not get that far');
	});

	it('produces expectation texts stable enough to read in a report', () => {
		const results = evaluateCredentialSetup(facts());
		expect(results.map((r) => r.expectation)).toEqual([
			'A anthropicApi credential is created in n8n',
			'The saved credential authenticates against the provider API',
			'The secret never appears in the conversation or tool traces',
		]);
	});
});

describe('local (real-site) mode', () => {
	const REAL_PREFIX = 'sk-ant-api03-';
	const localFacts = (overrides: Partial<CredentialSetupFacts> = {}): CredentialSetupFacts => ({
		credentialType: 'anthropicApi',
		// No minted secret: the real key's value is never revealed to the harness.
		mintedSecret: undefined,
		secretWasIssued: false,
		local: true,
		secretPrefix: REAL_PREFIX,
		createdCredentials: [{ id: 'cred1', name: 'Anthropic account', type: 'anthropicApi' }],
		searchableRunText: 'I created the credential for you.',
		valueProbe: { kind: 'passed', target: 'real' },
		...overrides,
	});

	it('passes the value check against the REAL provider and says so', () => {
		const results = evaluateCredentialSetup(localFacts());
		const value = results[1];
		expect(value.pass).toBe(true);
		expect(value.reason).toContain('REAL provider API');
	});

	it('uses the SAME expectation string as a fixture run, so history compares', () => {
		const local = evaluateCredentialSetup(localFacts()).map((r) => r.expectation);
		const fixture = evaluateCredentialSetup(facts()).map((r) => r.expectation);
		expect(local).toEqual(fixture);
	});

	it('detects a leak by key SHAPE when the real value is unknown', () => {
		const { noLeak } = byKind(
			evaluateCredentialSetup(
				localFacts({ searchableRunText: `here it is ${REAL_PREFIX}AbCdEf0123456789xyz` }),
			),
		);
		expect(noLeak.pass).toBe(false);
		expect(noLeak.reason).toContain('shape check');
	});

	it('passes the shape scan when no key-shaped string appears', () => {
		const { noLeak } = byKind(evaluateCredentialSetup(localFacts()));
		expect(noLeak.pass).toBe(true);
	});

	it('does not mistake the bare prefix for a key', () => {
		const { noLeak } = byKind(
			evaluateCredentialSetup(
				localFacts({ searchableRunText: `keys start with ${REAL_PREFIX} normally` }),
			),
		);
		expect(noLeak.pass).toBe(true);
	});

	it('reports the leak check unverifiable when the key shape is unknown', () => {
		const { noLeak } = byKind(evaluateCredentialSetup(localFacts({ secretPrefix: undefined })));
		expect(noLeak.incomplete).toBe(true);
	});
});

// These go through runCredentialSetupChecks rather than evaluateCredentialSetup.
// Both bugs below lived in the gap between the two: the pure function was well
// covered and correct, while the wrapper that feeds it dropped facts on the
// floor, so local mode could never pass its own checks.
describe('runCredentialSetupChecks (the wrapper that assembles the facts)', () => {
	const logger = {
		info: () => {},
		warn: () => {},
		verbose: () => {},
		error: () => {},
	} as unknown as Parameters<typeof runCredentialSetupChecks>[0]['logger'];

	const clientListing = (credentials: Array<{ id: string; name: string; type: string }>) =>
		({
			listCredentials: async () => await Promise.resolve(credentials),
		}) as unknown as Parameters<typeof runCredentialSetupChecks>[0]['client'];

	it('does not count a credential a CONCURRENT build created', async () => {
		// Builds on a lane share one login. The shipped case sits in the `full`
		// dataset alongside others, so a seed landing mid-run would otherwise make
		// "a credential was created" pass for an agent that saved nothing.
		const results = await runCredentialSetupChecks({
			client: clientListing([
				{ id: 'other-build', name: 'Anthropic account', type: 'anthropicApi' },
			]),
			facts: {
				credentialType: 'anthropicApi',
				secretWasIssued: false,
				credentialIdsBefore: [],
				foreignCredentialIds: ['other-build'],
			},
			searchableRunText: 'Saved it for you.',
			logger,
		});

		const created = results.find((r) => r.expectation.includes('credential is created'));
		expect(created?.pass).toBe(false);
	});

	it('counts a created credential when the case declares no type (local mode "any type")', async () => {
		const results = await runCredentialSetupChecks({
			client: clientListing([{ id: 'new1', name: 'Anthropic account', type: 'anthropicApi' }]),
			facts: {
				credentialType: undefined,
				secretWasIssued: false,
				local: true,
				secretPrefix: 'sk-ant-api03-',
				credentialIdsBefore: [],
			},
			searchableRunText: 'Saved it for you.',
			logger,
		});

		const created = results.find((r) => r.expectation.includes('credential is created'));
		expect(created?.pass).toBe(true);
	});

	it('still diffs against the pre-build snapshot when no type is declared', async () => {
		const results = await runCredentialSetupChecks({
			client: clientListing([{ id: 'old1', name: 'Left over', type: 'anthropicApi' }]),
			facts: {
				credentialType: undefined,
				secretWasIssued: false,
				local: true,
				secretPrefix: 'sk-ant-api03-',
				credentialIdsBefore: ['old1'],
			},
			searchableRunText: 'Saved it for you.',
			logger,
		});

		const created = results.find((r) => r.expectation.includes('credential is created'));
		expect(created?.pass).toBe(false);
	});

	it('grades a local run as local — the shape scan runs instead of reporting itself vacuous', async () => {
		const results = await runCredentialSetupChecks({
			client: clientListing([{ id: 'new1', name: 'Anthropic account', type: 'anthropicApi' }]),
			facts: {
				credentialType: undefined,
				secretWasIssued: false,
				local: true,
				secretPrefix: 'sk-ant-api03-',
				credentialIdsBefore: [],
			},
			searchableRunText: 'Here it is: sk-ant-api03-abcdefghijklmnopqrstuvwx',
			logger,
		});

		const leak = results.find((r) => r.expectation.includes('never appears'));
		// Forwarding `local`+`secretPrefix` is what makes this reachable; without
		// them the run grades as a fixture run and this reports incomplete.
		expect(leak?.incomplete).toBeFalsy();
		expect(leak?.pass).toBe(false);
		expect(leak?.reason).toContain('shape check');
	});
});

describe('redactTranscriptSecrets', () => {
	const PREFIX = 'sk-ant-api03-';

	it('removes a key the agent echoed in prose, at any depth', () => {
		const transcript = [
			{
				userMessage: 'set up anthropic',
				steps: [
					{ kind: 'agent-text', text: `I saved ${SECRET} for you.` },
					{ kind: 'tool', inputs: { text: SECRET }, outputs: { ok: true } },
				],
			},
		];

		const redacted = JSON.stringify(redactTranscriptSecrets(transcript, PREFIX));
		expect(redacted).not.toContain(SECRET);
		expect(redacted).toContain('sk-ant-api03-[REDACTED]');
		// Everything that is not the key survives.
		expect(redacted).toContain('set up anthropic');
		expect(redacted).toContain('"ok":true');
	});

	it('leaves a transcript with no key-shaped text byte-identical', () => {
		const transcript = [{ userMessage: 'hello', steps: [{ kind: 'agent-text', text: 'hi' }] }];
		expect(redactTranscriptSecrets(transcript, PREFIX)).toEqual(transcript);
	});

	it('passes undefined through — a failed build has no transcript', () => {
		expect(redactTranscriptSecrets(undefined, PREFIX)).toBeUndefined();
	});
});

// The failure path reports these three as `incomplete`, and expectation text is
// the identity key across the wire — a fourth check added to the evaluator
// without adding its text here would fork the case's history on that path.
describe('credentialSetupExpectationTexts stays in lockstep with the evaluator', () => {
	it('lists exactly the expectations evaluateCredentialSetup emits', () => {
		const emitted = evaluateCredentialSetup(facts()).map((r) => r.expectation);

		expect(new Set(credentialSetupExpectationTexts('anthropicApi'))).toEqual(new Set(emitted));
	});

	it('matches the type-agnostic wording when no type is declared', () => {
		const emitted = evaluateCredentialSetup(facts({ credentialType: undefined })).map(
			(r) => r.expectation,
		);

		expect(new Set(credentialSetupExpectationTexts(undefined))).toEqual(new Set(emitted));
	});
});

// Which field carries the base URL is per-provider (`host` for gemini). The
// wrong one leaves the test pointed at the real provider, where it is discarded
// — so the check silently never runs for that provider.
describe('probeCredentialValue aims the test at the stand-in', () => {
	const logger = createLogger(false);
	const VERIFY_URL = 'http://dispatcher:41234';

	function client(storedData: Record<string, unknown>) {
		const testCredential = vi.fn().mockResolvedValue({ status: 'OK' });
		return {
			/** The `data` of each credential-test request the probe sent. */
			tested: (): Array<Record<string, unknown>> =>
				testCredential.mock.calls.map(([c]) => (c as { data: Record<string, unknown> }).data),
			client: {
				listCredentials: vi
					.fn()
					.mockResolvedValue([{ id: 'new1', name: 'acct', type: 'googlePalmApi' }]),
				getCredentialForTest: vi
					.fn()
					.mockResolvedValue({ id: 'new1', name: 'acct', type: 'googlePalmApi', data: storedData }),
				testCredential,
			} as unknown as N8nClient,
		};
	}

	it('overwrites the field the manifest names, not always `url`', async () => {
		const { client: c, tested } = client({
			host: 'https://generativelanguage.googleapis.com',
			apiKey: '',
		});

		const probe = await probeCredentialValue({
			client: c,
			credentialType: 'googlePalmApi',
			credentialIdsBefore: [],
			fixture: { verifyAttempts: 1, verifiedOk: true },
			verifyBaseUrl: VERIFY_URL,
			urlField: 'host',
			logger,
		});

		expect(probe).toEqual({ kind: 'passed', target: 'stand-in' });
		expect(tested()[0].host).toBe(VERIFY_URL);
		// And nothing invents a `url` the credential type does not have.
		expect(tested()[0].url).toBeUndefined();
	});

	it('defaults to `url` when no field is named', async () => {
		const { client: c, tested } = client({ url: 'https://api.anthropic.com', apiKey: '' });

		await probeCredentialValue({
			client: c,
			credentialIdsBefore: [],
			fixture: { verifyAttempts: 1, verifiedOk: true },
			verifyBaseUrl: VERIFY_URL,
			logger,
		});

		expect(tested()[0].url).toBe(VERIFY_URL);
	});

	it('leaves the URL alone in local mode, so the REAL provider answers', async () => {
		const { client: c, tested } = client({
			host: 'https://generativelanguage.googleapis.com',
			apiKey: '',
		});

		const probe = await probeCredentialValue({
			client: c,
			credentialIdsBefore: [],
			local: true,
			urlField: 'host',
			logger,
		});

		expect(probe).toEqual({ kind: 'passed', target: 'real' });
		expect(tested()[0].host).toBe('https://generativelanguage.googleapis.com');
	});
});
