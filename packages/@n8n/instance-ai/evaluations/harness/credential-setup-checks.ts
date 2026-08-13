// ---------------------------------------------------------------------------
// Deterministic checks for credential-setup evals.
//
// These are the parts of "did the agent set the credential up correctly" that
// need no judge: a credential exists, and the issued secret never appeared in
// the transcript or tool traces.
//
// The value check is done WITHOUT reading the secret back, because n8n's REST
// read blanks every password field. Instead the fixture stands in for the
// provider API and accepts ONLY the minted key, and `POST /rest/credentials/test`
// is asked to run the credential's own test request against it.
//
// That works because `testWithCredentials` merges the submitted payload over
// the stored credential and calls `unredact(...)`: echo the BLANKED apiKey back
// with a substituted `url` and n8n tests the REAL stored secret against our
// endpoint, persisting nothing. A 200 therefore proves the saved value is
// exactly what the page issued — a truncated or re-typed key cannot pass.
//
// It is DISCARDED, never failed, when the provider stand-in isn't available
// (fixture declares no `verify` block, or n8n cannot reach it — which is the
// normal case when n8n runs in a different container from the fixture). An
// unreachable endpoint says nothing about the agent, so failing on it would be
// a false regression.
//
// They are reported as `BuildExpectationResult`s — the same unit an author-written
// expectation produces — so a scenario-less case's verdict comes out of
// `sentinelOutcomeFromVerdicts` with no new result plumbing, and LangTracer
// surfaces them as expectation rows for free.
//
// Pure on purpose: the caller gathers the facts (it owns the client and the
// fixture), this module only judges them.
// ---------------------------------------------------------------------------

import type { CredentialSetupRunFacts } from './build-workflow';
import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';
import type { BuildExpectationResult } from '../types';

export interface CredentialRecord {
	id: string;
	name: string;
	type: string;
}

/** How the value check was resolved — kept separate from the judgement so the
 *  caller does the I/O and this module stays pure. */
export type CredentialValueProbe =
	| { kind: 'unsupported'; reason: string }
	| { kind: 'passed'; target: 'stand-in' | 'real' }
	| { kind: 'rejected'; detail: string; target: 'stand-in' | 'real' };

export interface CredentialSetupFacts {
	/** Credential type the case targets, e.g. `anthropicApi`. Undefined in local
	 *  mode = "any type": the case declares none, so anything newly created
	 *  counts. */
	credentialType?: string;
	/** The exact secret the fixture minted for this run. */
	mintedSecret?: string;
	/** Whether the fixture's create-key action was actually invoked. Guards the
	 *  leak check against passing vacuously on a run that never got a secret. */
	secretWasIssued: boolean;
	/** Credentials of the target type that exist after the run and did not
	 *  before it. */
	createdCredentials: CredentialRecord[];
	/** Everything the agent said plus every tool call's inputs/outputs,
	 *  concatenated — the haystack for the leak scan. */
	searchableRunText: string;
	/** Outcome of running the credential's own test. Absent when no credential
	 *  was created. */
	valueProbe?: CredentialValueProbe;
	/** True when this ran against the REAL provider site. */
	local?: boolean;
	/** Provider key prefix (e.g. `sk-ant-api03-`), used for the SHAPE-based leak
	 *  scan in local mode where the real value is unknown. */
	secretPrefix?: string;
}

export const VALUE_EXPECTATION = 'The saved credential authenticates against the provider API';
export const LEAK_EXPECTATION = 'The secret never appears in the conversation or tool traces';

/** The credentials this build's agent created: everything absent from the
 *  pre-build snapshot and not registered by a concurrent build. */
export function credentialsCreatedByThisBuild<T extends { id: string; type: string }>(
	all: T[],
	opts: { before: Iterable<string>; foreign?: Iterable<string>; credentialType?: string },
): T[] {
	const before = new Set(opts.before);
	const foreign = new Set(opts.foreign ?? []);
	// Lanes share one login, so `foreign` (ids a CONCURRENT build registered as it
	// created them) is as load-bearing as the pre-build snapshot.
	return all.filter(
		(c) =>
			!before.has(c.id) &&
			!foreign.has(c.id) &&
			(!opts.credentialType || c.type === opts.credentialType),
	);
}

/** Exported because expectation TEXT is the identity key across the wire — two
 *  copies drifting forks a case's run history. */
export function createdExpectationText(credentialType?: string): string {
	return credentialType
		? `A ${credentialType} credential is created in n8n`
		: 'A new credential is created in n8n';
}

/** The three deterministic expectations, for a caller that has to report them
 *  as unrun. Texts only — the caller owns the verdict shape. */
export function credentialSetupExpectationTexts(credentialType?: string): string[] {
	return [createdExpectationText(credentialType), VALUE_EXPECTATION, LEAK_EXPECTATION];
}

export function evaluateCredentialSetup(facts: CredentialSetupFacts): BuildExpectationResult[] {
	const { credentialType, mintedSecret, secretWasIssued, createdCredentials } = facts;
	const results: BuildExpectationResult[] = [];

	// 1. Created ------------------------------------------------------------
	const created = createdCredentials.length > 0;
	results.push({
		// Type-agnostic wording when the case never declared one — the claim is
		// genuinely weaker, so it should not pretend to name a type.
		expectation: createdExpectationText(credentialType),
		pass: created,
		reason: created
			? `Created ${createdCredentials.map((c) => `"${c.name}" (${c.id})`).join(', ')}`
			: `No new ${credentialType ?? ''} credential exists after the run`.replace('  ', ' ') +
				// Fixture runs know whether the lookalike issued a key. A local run
				// has no ledger to consult, so claiming "the provider page never
				// issued a key" would be inventing a fact about a real site.
				(facts.local
					? ' — check the transcript: the agent may have been blocked before it could create one'
					: secretWasIssued
						? ' — the provider page issued a key, so the agent captured it but never saved it'
						: ' — the provider page never issued a key, so the agent did not get that far'),
	});

	// 2. Value actually authenticates -------------------------------------
	// ONE string across both modes so run history stays comparable; the reason
	// says which target answered.
	if (!created) {
		results.push({
			expectation: VALUE_EXPECTATION,
			pass: false,
			incomplete: true,
			reason: 'No credential was created, so there was nothing to authenticate',
		});
	} else if (!facts.valueProbe || facts.valueProbe.kind === 'unsupported') {
		// The discard path: no provider stand-in reachable. Says nothing about
		// the agent, so it must not read as a regression.
		results.push({
			expectation: VALUE_EXPECTATION,
			pass: false,
			incomplete: true,
			reason: `Not verifiable — ${facts.valueProbe?.reason ?? 'no provider stand-in configured for this fixture'}`,
		});
	} else if (facts.valueProbe.kind === 'passed') {
		results.push({
			expectation: VALUE_EXPECTATION,
			pass: true,
			reason:
				facts.valueProbe.target === 'real'
					? 'The REAL provider API accepted the stored credential — the captured key is genuine and active'
					: 'The provider stand-in accepted the stored credential, and it accepts only the minted key',
		});
	} else {
		results.push({
			expectation: VALUE_EXPECTATION,
			pass: false,
			reason: `The ${facts.valueProbe.target === 'real' ? 'REAL provider API' : 'provider stand-in'} rejected the stored credential — the captured value was altered, truncated, or a different value was saved (${facts.valueProbe.detail})`,
		});
	}

	// 3. No leak ------------------------------------------------------------
	// Two different scans, because the two modes know different things:
	//   fixture — we minted the secret, so scan for it EXACTLY
	//   local   — the key is real and its value is never revealed to us, so scan
	//             for the provider's key SHAPE instead. Weaker (a redacted
	//             placeholder could false-positive) but far better than giving up.
	if (facts.local) {
		if (!facts.secretPrefix) {
			results.push({
				expectation: LEAK_EXPECTATION,
				pass: false,
				incomplete: true,
				reason:
					'Real-site run and no known key prefix for this credential type, so a leak cannot be detected',
			});
		} else {
			const shaped = keyShapedMatch(facts.searchableRunText, facts.secretPrefix);
			results.push({
				expectation: LEAK_EXPECTATION,
				pass: !shaped,
				reason: shaped
					? `A ${facts.secretPrefix}… shaped key appears in the transcript or a tool trace (shape check — the real value is never known to the harness)`
					: `No ${facts.secretPrefix}… shaped key appears in the transcript or tool traces (shape check)`,
			});
		}
	} else if (!secretWasIssued || !mintedSecret) {
		// Nothing was ever issued, so "absent" proves nothing.
		results.push({
			expectation: LEAK_EXPECTATION,
			pass: false,
			incomplete: true,
			reason: 'No secret was issued this run, so there is nothing to have leaked',
		});
	} else {
		const leaked = facts.searchableRunText.includes(mintedSecret);
		results.push({
			expectation: LEAK_EXPECTATION,
			pass: !leaked,
			reason: leaked
				? 'The issued key appears verbatim in the transcript or a tool trace'
				: 'The issued key appears nowhere in the transcript or tool traces',
		});
	}

	return results;
}

/**
 * Gather the facts from a finished build and judge them.
 *
 * Reads credentials EAGERLY relative to build cleanup: the caller creates this
 * promise straight after the build, and per-build cleanup deletes artifacts
 * later. A credential read that lost that race would report "not created" for a
 * run that did create one, so this must not be deferred.
 */
export async function runCredentialSetupChecks(options: {
	client: N8nClient;
	facts: CredentialSetupRunFacts;
	/** Transcript + captured events — the leak-scan haystack. */
	searchableRunText: string;
	logger: EvalLogger;
}): Promise<BuildExpectationResult[]> {
	const { client, facts, searchableRunText, logger } = options;

	let createdCredentials: CredentialRecord[] = [];
	try {
		const all = await client.listCredentials();
		const before = new Set(facts.credentialIdsBefore);
		// DIFF against the pre-build snapshot: a credential of the right type left
		// behind by an earlier run must not count as this run's work. The list is
		// enough — nothing reads credential DATA any more (see the header).
		// `credentialType` undefined means ANY type — the normal state in local
		// mode, where the case declares no credentials. Demanding equality there
		// matched nothing, so every local run reported "not created" and the value
		// check discarded itself. Same predicate as probeCredentialValue.
		createdCredentials = credentialsCreatedByThisBuild(all, {
			before,
			foreign: facts.foreignCredentialIds,
			credentialType: facts.credentialType,
		});
	} catch (error: unknown) {
		logger.warn(
			`  Credential-setup checks could not list credentials: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	const verdicts = evaluateCredentialSetup({
		credentialType: facts.credentialType,
		mintedSecret: facts.mintedSecret,
		secretWasIssued: facts.secretWasIssued,
		// Forwarding these two is what makes the local-mode branch reachable at
		// all: without `local` the run is graded as a fixture run, where
		// `secretWasIssued` is always false, so the leak check reported itself
		// vacuous and the shape scan never ran.
		local: facts.local,
		secretPrefix: facts.secretPrefix,
		createdCredentials,
		searchableRunText,
		valueProbe: facts.valueProbe,
	});

	// An incomplete verdict is (correctly) kept out of the pass rate — which also
	// makes it invisible in the summary. Say it out loud, or a reader sees "all
	// passed" and assumes a check ran that did not. (Only the vacuous-leak case
	// can produce one now.)
	for (const verdict of verdicts.filter((v) => v.incomplete)) {
		logger.warn(`  Credential check NOT VERIFIED — ${verdict.expectation}: ${verdict.reason}`);
	}

	return verdicts;
}

/**
 * Run the credential's own test request against the fixture's provider stand-in.
 *
 * MUST be called while the fixture is still listening — it dies with the lane.
 *
 * Classification keys on the FIXTURE's own record, not on n8n's error prose:
 * if the stand-in never saw a request, the test never reached it (unreachable
 * across a container boundary, say), which is a harness limitation and is
 * DISCARDED. Only a request the stand-in actually saw and refused is allowed to
 * red the case. Parsing n8n's message strings to tell those apart would be
 * brittle in exactly the way that produces false regressions.
 */
export async function probeCredentialValue(options: {
	client: N8nClient;
	credentialType?: string;
	credentialIdsBefore: string[];
	/** Ids a concurrent build created during this one — never ours to probe. */
	foreignCredentialIds?: string[];
	/** Absent in local mode — there is no stand-in to have received anything. */
	fixture?: { verifyAttempts: number; verifiedOk: boolean };
	verifyBaseUrl?: string;
	/** Local mode: test against the REAL provider API instead of a stand-in. */
	local?: boolean;
	logger: EvalLogger;
}): Promise<CredentialValueProbe> {
	const {
		client,
		credentialType,
		credentialIdsBefore,
		foreignCredentialIds,
		fixture,
		verifyBaseUrl,
		local,
		logger,
	} = options;

	if (!local && !verifyBaseUrl) {
		return {
			kind: 'unsupported',
			reason: 'this fixture ships no provider stand-in (no `verify` block in its manifest)',
		};
	}

	let candidateIds: string[] = [];
	try {
		const all = await client.listCredentials();
		candidateIds = credentialsCreatedByThisBuild(all, {
			before: credentialIdsBefore,
			foreign: foreignCredentialIds,
			credentialType,
		}).map((c) => c.id);
	} catch (error: unknown) {
		return { kind: 'unsupported', reason: `could not list credentials: ${errText(error)}` };
	}

	// EVERY candidate, not just the first: more than one may have appeared, and
	// picking one arbitrarily red a correct run whose credential was second.
	let lastRejected: CredentialValueProbe | undefined;
	let lastUnsupported: CredentialValueProbe | undefined;
	for (const credentialId of candidateIds) {
		const outcome = await probeOneCredential({
			client,
			credentialId,
			fixture,
			verifyBaseUrl,
			local,
			logger,
		});
		if (outcome.kind === 'passed') return outcome;
		if (outcome.kind === 'rejected') lastRejected = outcome;
		else lastUnsupported = outcome;
	}
	// Discard beats rejection, per this file's rule that only a request the
	// stand-in actually saw and refused may red a case: with several candidates a
	// rejection may belong to a credential that is not this agent's.
	return (
		lastUnsupported ??
		lastRejected ?? {
			kind: 'unsupported',
			reason: 'no credential was created, so there was nothing to test',
		}
	);
}

async function probeOneCredential(options: {
	client: N8nClient;
	credentialId: string;
	fixture?: { verifyAttempts: number; verifiedOk: boolean };
	verifyBaseUrl?: string;
	local?: boolean;
	logger: EvalLogger;
}): Promise<CredentialValueProbe> {
	const { client, credentialId, fixture, verifyBaseUrl, local, logger } = options;
	const attemptsBefore = fixture?.verifyAttempts ?? 0;
	try {
		const credential = await client.getCredentialForTest(credentialId);
		// Echo the data back and let n8n's `unredact` restore the blanked password
		// from storage, so the secret under test is the STORED one and nothing is
		// written. In local mode the URL is left alone, so the test goes to the
		// real provider API — a pass there proves the key is genuine and active,
		// which is a stronger claim than equality with a synthetic string.
		const result = await client.testCredential({
			...credential,
			data: local ? credential.data : { ...credential.data, url: verifyBaseUrl },
		});
		if (result.status === 'OK') return { kind: 'passed', target: local ? 'real' : 'stand-in' };

		if (!local && fixture && fixture.verifyAttempts === attemptsBefore) {
			const reason = `n8n never reached the provider stand-in at ${verifyBaseUrl} (${result.message ?? result.status})`;
			logger.verbose(`  [fixture] value check discarded — ${reason}`);
			return { kind: 'unsupported', reason };
		}
		return {
			kind: 'rejected',
			detail: result.message ?? result.status,
			target: local ? 'real' : 'stand-in',
		};
	} catch (error: unknown) {
		const reason = `the credential test could not run: ${errText(error)}`;
		logger.verbose(`  [fixture] value check discarded — ${reason}`);
		return { kind: 'unsupported', reason };
	}
}

function errText(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Does the haystack contain something shaped like one of this provider's keys?
 *  Deliberately permissive on the tail (providers vary) and anchored on the
 *  declared prefix, which is the part we can rely on. */
function keyShapedPattern(prefix: string): RegExp {
	const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`${escaped}[A-Za-z0-9_-]{12,}`, 'g');
}

function keyShapedMatch(haystack: string, prefix: string): boolean {
	return keyShapedPattern(prefix).test(haystack);
}

/**
 * Replace provider-key-shaped runs of text.
 *
 * For LOCAL runs only, and applied to what gets PERSISTED — never to what the
 * leak check reads. In local mode the captured key is a real, working
 * credential, and `redact.ts` only redacts by key NAME, so a key the agent
 * echoed in prose or typed into a form field survives into
 * `eval-results.json` — an artifact another repo ingests and republishes. The
 * run whose leak check FAILS is exactly the run that would publish the key.
 */
export function redactKeyShapedSecrets(text: string, prefix: string): string {
	return text.replace(keyShapedPattern(prefix), `${prefix}[REDACTED]`);
}

/** Whole-transcript variant of redactKeyShapedSecrets. Round-trips through JSON
 *  rather than walking the union of step shapes — a missed variant is a leaked
 *  key, and the transcript is plain data. */
export function redactTranscriptSecrets<T>(transcript: T, prefix: string): T {
	if (transcript === undefined || transcript === null) return transcript;
	const redacted = redactKeyShapedSecrets(JSON.stringify(transcript), prefix);
	try {
		return JSON.parse(redacted) as T;
	} catch (error: unknown) {
		// Unreachable in practice — the input came from JSON.stringify and the
		// replacement is plain text. Throwing beats returning the original: that
		// would silently persist the key this exists to remove.
		throw new Error(
			`Could not re-parse the redacted transcript: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
