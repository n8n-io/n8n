// ---------------------------------------------------------------------------
// Credential-setup lane — composes the fixture server and the browser runtime
// for one case, and takes them both down again.
//
// PAY-PER-USE is the whole point: `resolveCredentialSetupLane` returns
// undefined for every case that is not a credential-setup case, and nothing
// boots. No other suite ever starts a browser or opens a port.
//
// Selection is the case's `credentialFixture` field: a shipped fixture id for a
// hermetic run, or the reserved id `local` for a REAL-site run in the
// developer's own browser. The legacy tag pair (`credential-setup` + a provider
// id) still resolves, for one release, so cases authored before the field keep
// working.
// ---------------------------------------------------------------------------

import {
	attachToRunningBrowser,
	startBrowserRuntime,
	type BrowserRuntime,
} from './browser-runtime';
import {
	findFixtureForCredentialType,
	loadProviderFixtures,
	startFixtureServer,
	type FixtureServer,
	type ProviderFixture,
} from './fixture-server';
import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';

/** Reserved `credentialFixture` value: drive the REAL provider site in the
 *  developer's own browser instead of a lookalike. Reserved means a fixture
 *  directory may not be called this — `loadProviderFixtures` rejects it. */
export const LOCAL_FIXTURE_ID = 'local';

/**
 * What the lane should do for this case. Three states rather than
 * `ProviderFixture | undefined`, so every caller handles "real site" explicitly
 * instead of inferring it from an absence.
 */
export type LaneSelection =
	| { kind: 'fixture'; fixture: ProviderFixture }
	| { kind: 'local' }
	| { kind: 'none' };

export interface CredentialSetupLane {
	/** Absent in local mode — there is no lookalike to serve. */
	fixture?: FixtureServer;
	/** True when this run drives the REAL provider site in the developer's browser. */
	local: boolean;
	browser: BrowserRuntime;
	/** Credential type the case targets — what the post-run checks look for.
	 *  UNKNOWN in local mode: a credential-setup case deliberately declares no
	 *  credentials (the agent creates one), so there is nothing to read it from.
	 *  Undefined means "any type" to the checks. */
	credentialType?: string;
	/** Base URL for the provider-API stand-in, when this fixture ships one.
	 *  Undefined => the credential-value check reports itself unverifiable. */
	verifyBaseUrl?: string;
	/** Manifest `urlField`. Absent in local mode, where nothing is substituted. */
	credentialUrlField?: string;
	close(): Promise<void>;
}

/**
 * What the lane should do for this case.
 *
 * `credentialFixture` is the only opt-in. A case that ASKS for the lane but
 * names nothing resolvable THROWS, listing what is available — the silent
 * `undefined` this replaced let the run continue with no browser, so the agent
 * failed for the wrong reason and it read as an agent regression.
 */
export async function resolveCredentialSetupFixture(caseFields: {
	credentialFixture?: string;
}): Promise<LaneSelection> {
	const { credentialFixture } = caseFields;

	if (credentialFixture === LOCAL_FIXTURE_ID) return { kind: 'local' };
	// Answer the common case before touching disk. This runs for EVERY build of
	// EVERY case, and `loadProviderFixtures` throws on any malformed manifest —
	// so loading first meant one bad fixture directory failed every suite in the
	// repo, not just the browser lane.
	if (!credentialFixture) return { kind: 'none' };

	const fixtures = await loadProviderFixtures();
	const available = () =>
		fixtures
			.map((f) => f.id)
			.sort()
			.join(', ');

	const fixture = fixtures.find((f) => f.id === credentialFixture);
	if (!fixture) {
		throw new Error(
			`Unknown credentialFixture "${credentialFixture}". ` +
				`Available: ${available() || '(none)'}, or "${LOCAL_FIXTURE_ID}" for the real site.`,
		);
	}
	return { kind: 'fixture', fixture };
}

/** Same decision, expressed over a credential type — for callers that know the
 *  type directly (e.g. a future card/resume path, where the type arrives in the
 *  resume payload rather than a tag). */
export const resolveFixtureForCredentialType = findFixtureForCredentialType;

export interface StartCredentialSetupLaneOptions {
	client: N8nClient;
	/** What this run talks to. `local` boots NO fixture at all. */
	selection: LaneSelection;
	logger: EvalLogger;
	/** Credential type the checks look for, if the case happens to declare one.
	 *  Usually undefined for local runs — see CredentialSetupLane.credentialType. */
	localCredentialType?: string;
}

export async function startCredentialSetupLane(
	options: StartCredentialSetupLaneOptions,
): Promise<CredentialSetupLane | undefined> {
	const { client, selection, logger, localCredentialType } = options;
	if (selection.kind === 'none') return undefined;

	// ---- Local: real provider site, developer's browser, no fixture ---------
	if (selection.kind === 'local') {
		// No fixture server: it would open a port, mint a cert for hostnames the
		// browser will never be redirected to, and issue a secret nothing can
		// reach. Previously `attended` booted one anyway.
		//
		// And no browser LAUNCH either — we attach to the one the developer is
		// already using, which is what makes their logins and their installed
		// extension available. See attachToRunningBrowser.
		const browser = await attachToRunningBrowser({ client, logger });
		logger.info('  Local mode: driving the REAL provider site in your browser');
		return {
			local: true,
			browser,
			credentialType: localCredentialType,
			close: async () => {
				await browser.close().catch(() => {});
			},
		};
	}

	// ---- Fixture: hermetic lookalike ----------------------------------------
	const { fixture } = selection;
	const fixtureServer = await startFixtureServer({ fixture, logger });
	let browser: BrowserRuntime;
	try {
		browser = await startBrowserRuntime({
			client,
			logger,
			hostResolverRules: fixtureServer.hostResolverRules(),
			headed: false,
		});
	} catch (error: unknown) {
		// Never leave the port open if the browser half failed.
		await fixtureServer.close();
		throw error;
	}

	return {
		fixture: fixtureServer,
		local: false,
		browser,
		credentialType: fixture.manifest.credentialType,
		verifyBaseUrl: fixtureServer.verifyBaseUrl,
		credentialUrlField: fixture.manifest.urlField,
		close: async () => {
			// Browser first: it is the thing holding pages open against the fixture.
			await browser.close().catch(() => {});
			await fixtureServer.close();
		},
	};
}
