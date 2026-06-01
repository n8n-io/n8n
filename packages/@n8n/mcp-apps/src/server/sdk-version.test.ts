import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { satisfies, validRange, valid } from 'semver';
import { describe, expect, it } from 'vitest';

type PackageJson = {
	name: string;
	version: string;
	peerDependencies?: Record<string, string>;
};

/**
 * Resolve a package's `package.json` by walking up from a resolved subpath.
 *
 * Both `@modelcontextprotocol/ext-apps` and `@modelcontextprotocol/sdk` omit
 * `./package.json` from their `exports` map, so the conventional
 * `require('<pkg>/package.json')` does not work for them. Additionally, the
 * SDK's `.` (main) entry points to a file that ships only under subpath
 * exports — so we resolve through a known subpath instead.
 */
function readPackageJson(
	requireFromHere: NodeRequire,
	packageName: string,
	resolvableSubpath: string,
): PackageJson {
	let dir = dirname(requireFromHere.resolve(resolvableSubpath));
	while (dir !== dirname(dir)) {
		const pkgJsonPath = join(dir, 'package.json');
		if (existsSync(pkgJsonPath)) {
			const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as PackageJson;
			if (pkg.name === packageName) return pkg;
		}
		dir = dirname(dir);
	}
	throw new Error(`Could not locate package.json for ${packageName}`);
}

/**
 * Guards against silent drift between three independently versioned pins:
 *
 *  - `@modelcontextprotocol/ext-apps` declares a peer range for
 *    `@modelcontextprotocol/sdk` (e.g. `^1.24.0`).
 *  - The pnpm workspace catalog pins the SDK to a concrete version.
 *  - `@n8n/mcp-apps` and `packages/cli` reference that catalog entry.
 *
 * Bumping `ext-apps` or the catalog SDK pin in isolation can silently break
 * the relationship; with `strict-peer-dependencies = false` in `.npmrc`, pnpm
 * only warns. This test fails CI the moment the installed SDK version no
 * longer satisfies ext-apps' declared peer range.
 *
 * We resolve both `package.json` files via Node's actual resolution, which
 * honors pnpm's install layout (including catalog substitution), so the
 * assertion reflects what consumers will actually run with.
 */
describe('@modelcontextprotocol/sdk compatibility with @modelcontextprotocol/ext-apps', () => {
	const requireFromHere = createRequire(import.meta.url);

	// `@modelcontextprotocol/ext-apps`: `.` is the main entry and resolves.
	// `@modelcontextprotocol/sdk`: `.` points to files that aren't shipped;
	// resolve via `./server/mcp.js`, which the runtime code already imports.
	const extAppsPkg = readPackageJson(
		requireFromHere,
		'@modelcontextprotocol/ext-apps',
		'@modelcontextprotocol/ext-apps',
	);
	const sdkPkg = readPackageJson(
		requireFromHere,
		'@modelcontextprotocol/sdk',
		'@modelcontextprotocol/sdk/server/mcp.js',
	);

	const sdkPeerRange = extAppsPkg.peerDependencies?.['@modelcontextprotocol/sdk'];

	it('declares an SDK peer range on ext-apps', () => {
		expect(sdkPeerRange).toBeDefined();
		expect(validRange(sdkPeerRange)).not.toBeNull();
	});

	it('installs a valid SDK version', () => {
		expect(valid(sdkPkg.version)).not.toBeNull();
	});

	it('installed SDK satisfies ext-apps peer range', () => {
		// If this fails, the catalog SDK pin in `pnpm-workspace.yaml` and the
		// `@modelcontextprotocol/ext-apps` catalog pin must be reconciled.
		expect(
			satisfies(sdkPkg.version, sdkPeerRange ?? '*'),
			`Installed @modelcontextprotocol/sdk@${sdkPkg.version} does not satisfy ` +
				`@modelcontextprotocol/ext-apps@${extAppsPkg.version}'s peer range ` +
				`"${sdkPeerRange}". Update the catalog SDK pin in pnpm-workspace.yaml ` +
				'or revert the ext-apps bump.',
		).toBe(true);
	});
});
