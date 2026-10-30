import fs from 'node:fs';
import path from 'node:path';
import { ESLint, type Linter } from 'eslint';
import { spawnSync } from 'node:child_process';
import { isRecord } from '@n8n/utils/is-record';
import tmp from 'tmp';
import semver from 'semver';
import axios from 'axios';
import glob from 'fast-glob';
import { defineConfig } from 'eslint/config';

import {
	checkPackageProvenance,
	NPM_PROVENANCE_PREDICATE_TYPE,
	type PackageMetadata,
} from './provenance.js';

// Cap registry/tarball requests; axios has no default timeout, so a stalled
// connection would otherwise hang the scan indefinitely.
axios.defaults.timeout = 300_000;

const { stdout } = process;
const TEMP_DIR = tmp.dirSync({ unsafeCleanup: true }).name;
const registry = 'https://registry.npmjs.org/';

type Attestation = {
	readonly predicateType?: string;
	readonly bundle?: { readonly dsseEnvelope?: { readonly payload?: string } };
};

type SourceRepo = {
	readonly owner: string;
	readonly repo: string;
	readonly gitCommit: string;
};

export type AnalysisResult =
	| { readonly passed: true; readonly message?: string; readonly details?: never }
	| {
			readonly passed: false;
			readonly message: string;
			readonly details?: string;
			readonly error?: unknown;
	  };

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const field = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);

/**
 * Checks if the given childPath is contained within the parentPath. Resolves
 * the paths before comparing them, so that relative paths are also supported.
 */
export const isContainedWithin = (parentPath: string, childPath: string): boolean => {
	parentPath = path.resolve(parentPath);
	childPath = path.resolve(childPath);

	if (parentPath === childPath) {
		return true;
	}

	return childPath.startsWith(parentPath + path.sep);
};

/**
 * Joins the given paths to the parentPath, ensuring that the resulting path
 * is still contained within the parentPath. If not, it throws an error to
 * prevent path traversal vulnerabilities.
 */
export const safeJoinPath = (parentPath: string, ...paths: string[]): string => {
	const candidate = path.join(parentPath, ...paths);

	if (!isContainedWithin(parentPath, candidate)) {
		throw new Error(
			`Path traversal detected, refusing to join paths: ${parentPath} and ${JSON.stringify(paths)}`,
		);
	}

	return candidate;
};

export const resolvePackage = (
	packageSpec: string,
): { packageName: string; version: string | null } => {
	// Validate input to prevent command injection
	if (!/^[a-zA-Z0-9@/_.-]+$/.test(packageSpec)) {
		throw new Error('Invalid package specification');
	}

	const isScoped = packageSpec.startsWith('@');
	const hasScopedVersion = isScoped && packageSpec.includes('@', 1);

	switch (true) {
		case hasScopedVersion: {
			const lastAtIndex = packageSpec.lastIndexOf('@');
			return {
				packageName: packageSpec.substring(0, lastAtIndex),
				version: packageSpec.substring(lastAtIndex + 1),
			};
		}
		case isScoped && !hasScopedVersion:
			return { packageName: packageSpec, version: null };
		default: {
			const [packageName = '', version] = packageSpec.split('@');
			return { packageName, version: version || null };
		}
	}
};

/**
 * Picks the exact version to scan: the latest one without a spec, the highest
 * match for a range, and otherwise the version a dist-tag points to.
 */
export const resolveVersion = (metadata: PackageMetadata, version: string | null): string => {
	const isRange = version !== null && semver.validRange(version) !== null && !semver.valid(version);

	switch (true) {
		case !version: {
			const latest = metadata['dist-tags'].latest;
			if (!latest) throw new Error('No latest version found');
			return latest;
		}
		case isRange: {
			const match = semver.maxSatisfying(Object.keys(metadata.versions), version);
			if (!match) throw new Error(`No version found matching ${version}`);
			return match;
		}
		default:
			return metadata['dist-tags'][version] ?? version;
	}
};

const downloadAndExtractPackage = async (packageName: string, version: string) => {
	try {
		// Download the tarball using safe arguments
		const npmResult = spawnSync('npm', ['-q', 'pack', `${packageName}@${version}`], {
			cwd: TEMP_DIR,
			stdio: 'pipe',
			shell: process.platform === 'win32',
		});
		if (npmResult.status !== 0) {
			throw new Error(`npm pack failed: ${npmResult.stderr?.toString()}`);
		}
		const tarballName = fs.readdirSync(TEMP_DIR).find((file) => file.endsWith('.tgz'));
		if (!tarballName) {
			throw new Error('Tarball not found');
		}

		// Unpack the tarball
		const packageDir = safeJoinPath(TEMP_DIR, `${packageName}-${version}`);
		fs.mkdirSync(packageDir, { recursive: true });
		const tarResult = spawnSync(
			'tar',
			['-xzf', tarballName, '-C', packageDir, '--strip-components=1'],
			{
				cwd: TEMP_DIR,
				stdio: 'pipe',
				shell: process.platform === 'win32',
			},
		);
		if (tarResult.status !== 0) {
			throw new Error(`tar extraction failed: ${tarResult.stderr?.toString()}`);
		}
		fs.unlinkSync(safeJoinPath(TEMP_DIR, tarballName));

		return packageDir;
	} catch (error: unknown) {
		console.error(`\nFailed to download package: ${errorMessage(error)}`);
		throw error;
	}
};

/**
 * Extracts the source repository and commit a package was built from, out of
 * its npm provenance attestation. Provenance is already mandatory for the
 * scan to proceed, so any package that reaches this point attests exactly
 * which source produced the published artifact.
 *
 * Returns `null` when the attestation is missing, malformed, or points at an
 * unsupported host.
 */
export const parseSourceRepo = (
	attestations: readonly Attestation[] | undefined,
): SourceRepo | null => {
	const provenance = attestations?.find((a) => a.predicateType === NPM_PROVENANCE_PREDICATE_TYPE);
	const payload = provenance?.bundle?.dsseEnvelope?.payload;
	if (!payload) return null;

	let statement: unknown;
	try {
		statement = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
	} catch {
		return null;
	}

	const dependencies = field(
		field(field(statement, 'predicate'), 'buildDefinition'),
		'resolvedDependencies',
	);
	const dependency: unknown = Array.isArray(dependencies) ? dependencies[0] : undefined;
	const uri = field(dependency, 'uri');
	const gitCommit = field(field(dependency, 'digest'), 'gitCommit');
	if (typeof uri !== 'string' || typeof gitCommit !== 'string') return null;

	// ponytail: GitHub only — add a host→archive-URL mapping if GitLab-built packages show up
	const match =
		/^git\+https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:@|$)/.exec(uri);
	if (!match?.[1] || !match[2] || !/^[0-9a-f]{40,64}$/i.test(gitCommit)) return null;

	return { owner: match[1], repo: match[2], gitCommit };
};

// A source fetch failure fails the scan outright, so bound the requests —
// a stalled connection must not hang the gate.
const SOURCE_FETCH_TIMEOUT_MS = 30_000;

const fetchSourceInfo = async (packageName: string, version: string) => {
	const { data } = await axios.get<{ attestations?: Attestation[] }>(
		`${registry}-/npm/v1/attestations/${packageName}@${version}`,
		{ timeout: SOURCE_FETCH_TIMEOUT_MS },
	);
	return parseSourceRepo(data.attestations);
};

/**
 * Finds the directory inside a source checkout whose package.json declares
 * the given package name — handles both single-package repos and monorepos.
 */
export const findPackageRoot = (sourceDir: string, packageName: string): string | null => {
	const packageJsonPaths = glob.sync('**/package.json', {
		cwd: sourceDir,
		absolute: true,
		ignore: ['**/node_modules/**'],
	});

	for (const packageJsonPath of packageJsonPaths) {
		try {
			const packageJson: unknown = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			if (field(packageJson, 'name') === packageName) {
				return path.dirname(packageJsonPath);
			}
		} catch {
			// Unparseable package.json (e.g. a fixture) — keep looking
		}
	}

	return null;
};

const downloadAndExtractSource = async (
	{ owner, repo, gitCommit }: SourceRepo,
	packageName: string,
) => {
	const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${gitCommit}`;
	const { data } = await axios.get<ArrayBuffer>(url, {
		responseType: 'arraybuffer',
		timeout: SOURCE_FETCH_TIMEOUT_MS,
	});

	const tarballName = `source-${gitCommit}.tgz`;
	fs.writeFileSync(safeJoinPath(TEMP_DIR, tarballName), Buffer.from(data));

	const sourceDir = safeJoinPath(TEMP_DIR, `source-${gitCommit}`);
	fs.mkdirSync(sourceDir, { recursive: true });
	const tarResult = spawnSync(
		'tar',
		['-xzf', tarballName, '-C', sourceDir, '--strip-components=1'],
		{
			cwd: TEMP_DIR,
			stdio: 'pipe',
			shell: process.platform === 'win32',
		},
	);
	if (tarResult.status !== 0) {
		throw new Error(`tar extraction failed: ${tarResult.stderr?.toString()}`);
	}
	fs.unlinkSync(safeJoinPath(TEMP_DIR, tarballName));

	return findPackageRoot(sourceDir, packageName);
};

/**
 * What `n8n-node lint` covers at dev time: the shippable node/credential
 * sources plus package.json. Deliberately excludes repo dev files (gulpfile,
 * test configs, committed dist/) that never end up in the published package.
 */
export const SOURCE_FILE_PATTERNS = ['package.json', '{nodes,credentials}/**/*.{js,ts,json}'];

/**
 * Builds the flat ESLint config the scanner lints packages with. Exported so
 * tests can assert the external `eslint-plugin-n8n-nodes-base` plugin and its
 * rulesets are wired in, independent of ESLint execution.
 */
export const buildScanConfig = async (): Promise<Linter.Config[]> => {
	const { n8nCommunityNodesPlugin } = await import('@n8n/eslint-plugin-community-nodes');
	const parser = await import('@typescript-eslint/parser');
	const n8nNodesPlugin = (await import('eslint-plugin-n8n-nodes-base')).default;

	return defineConfig(
		n8nCommunityNodesPlugin.configs.recommended,
		{
			rules: { 'no-console': 'error' },
		},
		// Register the full `eslint-plugin-n8n-nodes-base` plugin and apply its
		// three rulesets so the scan gate enforces the same rules as
		// `n8n-node lint` (see node-cli/src/configs/eslint.ts). The off-overrides
		// below are kept identical. The `.ts` globs only ever match the
		// provenance-attested source checkout — the tarball leg lints compiled
		// `.js` and the published package.json only, where these rules would
		// no-op (the description AST is buried in a constructor) or
		// false-positive (the filename-convention rules hard-code a `.ts`
		// suffix that compiled output can never satisfy).
		{ plugins: { 'n8n-nodes-base': n8nNodesPlugin } },
		{
			files: ['package.json'],
			rules: { ...n8nNodesPlugin.configs.community.rules },
		},
		{
			files: ['**/credentials/**/*.ts'],
			rules: {
				...n8nNodesPlugin.configs.credentials.rules,
				// Not valid for community nodes
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
				// @n8n/eslint-plugin-community-nodes credential-password-field rule is more accurate
				'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
			},
		},
		{
			files: ['**/nodes/**/*.ts'],
			rules: {
				...n8nNodesPlugin.configs.nodes.rules,
				// Inputs and outputs can be enum instead of string "main"
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
				// Sometimes the 3rd party API does have a maximum limit, so maxValue is valid
				'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
			},
		},
		// JSON files (notably `package.json`) are not parseable by ESLint's
		// default JS parser, so register the TypeScript parser for them. The
		// community-nodes rules that gate on `package.json` walk a TSESTree
		// `ObjectExpression` AST, which `@typescript-eslint/parser` produces
		// when given a top-level JSON object literal.
		{
			files: ['**/*.json'],
			languageOptions: { parser },
		},
		// The external `nodes`/`credentials` rulesets walk a TSESTree AST, so
		// TS sources (when present in the tarball) need the TS parser too.
		{
			files: ['**/*.ts'],
			languageOptions: { parser },
		},
	);
};

export const analyzePackage = async (
	packageDir: string,
	filePatterns = ['**/*.js', '**/*.ts', '**/*.json'],
): Promise<AnalysisResult> => {
	const eslint = new ESLint({
		cwd: packageDir,
		allowInlineConfig: false,
		overrideConfigFile: true,
		overrideConfig: await buildScanConfig(),
	});

	try {
		// Lint both JS and JSON files. JSON inclusion is required because rules
		// such as `no-overrides-field`, `valid-peer-dependencies`, and
		// `package-name-convention` only run against `package.json`. Without
		// it the scanner silently skips every package.json-based rule.
		const filesToLint = glob.sync(filePatterns, {
			cwd: packageDir,
			absolute: true,
			ignore: ['node_modules/**', '**/package-lock.json'],
		});

		if (filesToLint.length === 0) {
			return { passed: true, message: 'No files found to analyze' };
		}

		const results = await eslint.lintFiles(filesToLint);
		const violations = results.filter((result) => result.errorCount > 0);

		if (violations.length > 0) {
			const formatter = await eslint.loadFormatter('stylish');
			const formattedResults = await formatter.format(results);
			return {
				passed: false,
				message: 'ESLint violations found',
				details: formattedResults,
			};
		}

		return { passed: true };
	} catch (error: unknown) {
		console.error(error);
		return {
			passed: false,
			message: `Analysis failed: ${errorMessage(error)}`,
			error,
		};
	}
};

export const analyzePackageByName = async (
	packageName: string,
	version: string | null,
): Promise<AnalysisResult & { packageName: string; version: string | null }> => {
	try {
		const { data: packageMetadata } = await axios.get<PackageMetadata>(
			`${registry}/${packageName}`,
		);
		const exactVersion = resolveVersion(packageMetadata, version);
		const label = `${packageName}@${exactVersion}`;

		stdout.write(`Checking provenance for ${label}...`);
		const provenanceResult = checkPackageProvenance(packageMetadata, exactVersion);
		if (stdout.isTTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}

		if (!provenanceResult.passed) {
			stdout.write(`❌ Provenance check failed for ${label} \n`);

			return {
				packageName,
				version: exactVersion,
				...provenanceResult,
			};
		}

		stdout.write(`✅ Provenance check passed for ${label} \n`);

		// Lint the source the provenance attestation points at: the
		// node/credential rules are written for `.ts` sources and mostly no-op
		// (or false-positive on filenames) against the compiled output shipped
		// in the tarball. An unreachable source is a hard failure — falling
		// back to a tarball-only scan would silently reintroduce that blind
		// spot.
		stdout.write(`Fetching source for ${label}...`);
		let sourceDir: string | null = null;
		let sourceInfo: SourceRepo | null = null;
		let sourceError: unknown = null;
		try {
			sourceInfo = await fetchSourceInfo(packageName, exactVersion);
			if (sourceInfo) {
				sourceDir = await downloadAndExtractSource(sourceInfo, packageName);
			}
		} catch (error: unknown) {
			sourceError = error;
		}
		if (stdout.isTTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}

		if (!sourceDir || !sourceInfo) {
			const reason = sourceError
				? errorMessage(sourceError)
				: 'unsupported or unlocatable source repository';
			stdout.write(`❌ Could not fetch source for ${label} \n`);

			return {
				packageName,
				version: exactVersion,
				passed: false,
				message: `Could not fetch the source repository recorded in the package's npm provenance (${reason}). The scan lints the attested source, so it must be reachable — publish with provenance from a public GitHub repository.`,
			};
		}

		const shortCommit = sourceInfo.gitCommit.slice(0, 7);
		stdout.write(
			`✅ Fetched source from github.com/${sourceInfo.owner}/${sourceInfo.repo}@${shortCommit} \n`,
		);

		stdout.write(`Downloading ${label}...`);
		const packageDir = await downloadAndExtractPackage(packageName, exactVersion);
		if (stdout.isTTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}
		stdout.write(`✅ Downloaded ${label} \n`);

		stdout.write(`Analyzing ${label}...`);
		// The source checkout gets the full rule set on real `.ts` sources.
		// The shipped artifact must stay scanned too: provenance pins the
		// source commit, not the build output — a build step can emit anything
		// into `dist/`. Scope the tarball leg to compiled `.js` and the
		// published package.json; `.ts`/`.d.ts` declarations are covered better
		// by the source scan and only false-positive on filename rules here.
		const sourceResult = await analyzePackage(sourceDir, SOURCE_FILE_PATTERNS);
		const distResult = await analyzePackage(packageDir, ['**/*.js', 'package.json']);
		const failures = [sourceResult, distResult].filter((r) => !r.passed);
		const [firstFailure] = failures;
		const analysisResult: AnalysisResult = firstFailure
			? {
					passed: false,
					message: firstFailure.message,
					details:
						failures
							.map((r) => r.details)
							.filter(Boolean)
							.join('\n') || undefined,
				}
			: { passed: true };
		if (stdout.isTTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}
		stdout.write(`✅ Analyzed ${label} \n`);

		return {
			packageName,
			version: exactVersion,
			...analysisResult,
		};
	} catch (error: unknown) {
		console.error(`Failed to analyze ${packageName}@${version}:`, error);
		return {
			packageName,
			version,
			passed: false,
			message: `Analysis failed: ${errorMessage(error)}`,
		};
	}
};
