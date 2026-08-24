// Serve a provider fixture on its own, so a human can look at the page the
// agent sees.
//
// The lane's fixture server is per-run and dies with the case, on a random
// port behind host-mapping — fine for the eval, useless for eyeballing. This
// boots the SAME `startFixtureServer` and just leaves it up.
//
// Also the mechanism WS9's drift refresh needs: to re-check a lookalike page
// against the real console you have to be able to open it.
//
//   pnpm -F @n8n/instance-ai eval:serve-fixture -- --fixture anthropic
//
// Routing is by PATH, so plain `https://127.0.0.1:<port>/settings/keys` works;
// the cert is self-signed, so the browser will warn once.

import { loadProviderFixtures, startFixtureServer } from '../harness/fixture-server';
import { createLogger } from '../harness/logger';

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	const at = argv.indexOf('--fixture');
	const wanted = at >= 0 ? argv[at + 1] : undefined;

	const fixtures = await loadProviderFixtures();
	const available = fixtures.map((f) => f.id).join(', ') || '(none)';

	const fixture = wanted ? fixtures.find((f) => f.id === wanted) : undefined;
	if (!fixture) {
		console.error(
			wanted
				? `No fixture "${wanted}". Available: ${available}`
				: `Pass --fixture <id>. Available: ${available}`,
		);
		process.exit(1);
	}

	const server = await startFixtureServer({ fixture, logger: createLogger(true) });

	console.log(`\n  fixture:   ${fixture.id}  (${fixture.manifest.credentialType})`);
	console.log(`  stands in for: ${fixture.manifest.hosts.join(', ')}`);
	console.log(`  minted secret for this session: ${server.mintedSecret}`);
	console.log('\n  Open (accept the self-signed cert):');
	for (const route of Object.keys(fixture.manifest.routes)) {
		console.log(`    https://127.0.0.1:${String(server.port)}${route}`);
	}
	console.log('\n  Ctrl-C to stop.\n');

	const stop = () => {
		void server.close().then(() => process.exit(0));
	};
	process.on('SIGINT', stop);
	process.on('SIGTERM', stop);
}

void main();
