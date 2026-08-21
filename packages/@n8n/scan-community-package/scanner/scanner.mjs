#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { ESLint } from 'eslint';
import { spawnSync } from 'child_process';
import tmp from 'tmp';
import semver from 'semver';
import axios from 'axios';
import glob from 'fast-glob';
import { fileURLToPath } from 'url';
import { defineConfig } from 'eslint/config';

import { checkPackageProvenance, NPM_PROVENANCE_PREDICATE_TYPE } from './provenance.mjs';

const { stdout } = process;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = tmp.dirSync({ unsafeCleanup: true }).name;
const registry = 'https://registry.npmjs.org/';

/**
 * Checks if the given childPath is contained within the parentPath. Resolves
 * the paths before comparing them, so that relative paths are also supported.
 */
export function isContainedWithin(parentPath, childPath) {
	parentPath = path.resolve(parentPath);
	childPath = path.resolve(childPath);

	if (parentPath === childPath) {
		return true;
	}

	return childPath.startsWith(parentPath + path.sep);
}

/**
 * Joins the given paths to the parentPath, ensuring that the resulting path
 * is still contained within the parentPath. If not, it throws an error to
 * prevent path traversal vulnerabilities.
 *
 * @throws {UnexpectedError} If the resulting path is not contained within the parentPath.
 */
export function safeJoinPath(parentPath, ...paths) {
	const candidate = path.join(parentPath, ...paths);

	if (!isContainedWithin(parentPath, candidate)) {
		throw new Error(
			`Path traversal detected, refusing to join paths: ${parentPath} and ${JSON.stringify(paths)}`,
		);
	}

	return candidate;
}

export const resolvePackage = (packageSpec) => {
	// Validate input to prevent command injection
	if (!/^[a-zA-Z0-9@/_.-]+$/.test(packageSpec)) {
		throw new Error('Invalid package specification');
	}

	let packageName, version;
	if (packageSpec.startsWith('@')) {
		if (packageSpec.includes('@', 1)) {
			// Handle scoped packages with versions
			const lastAtIndex = packageSpec.lastIndexOf('@');
			return {
				packageName: packageSpec.substring(0, lastAtIndex),
				version: packageSpec.substring(lastAtIndex + 1),
			};
		} else {
			// Handle scoped packages without version
			return { packageName: packageSpec, version: null };
		}
	}
	// Handle regular packages
	const parts = packageSpec.split('@');
	return { packageName: parts[0], version: parts[1] || null };
};

const downloadAndExtractPackage = async (packageName, version) => {
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
	} catch (error) {
		console.error(`\nFailed to download package: ${error.message}`);
		throw error;
	}
};

/**
 * Extracts the source repository and commit a package was built from, out of
 * its npm provenance attestation. Provenance is already mandatory for the
 * scan to proceed, so any package that reaches this point attests exactly
 * which source produced the published artifact.
 *
 * Returns `{ owner, repo, gitCommit }`, or `null` when the attestation is
 * missing, malformed, or points at an unsupported host.
 */
export const parseSourceRepo = (attestations) => {
	const provenance = attestations?.find((a) => a.predicateType === NPM_PROVENANCE_PREDICATE_TYPE);
	const payload = provenance?.bundle?.dsseEnvelope?.payload;
	if (!payload) return null;

	let statement;
	try {
		statement = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
	} catch {
		return null;
	}

	const dependency = statement?.predicate?.buildDefinition?.resolvedDependencies?.[0];
	const gitCommit = dependency?.digest?.gitCommit;
	// ponytail: GitHub only — add a host→archive-URL mapping if GitLab-built packages show up
	const match =
		/^git\+https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:@|$)/.exec(
			dependency?.uri ?? '',
		);
	if (!match || !/^[0-9a-f]{40,64}$/i.test(gitCommit ?? '')) return null;

	return { owner: match[1], repo: match[2], gitCommit };
};

// A source fetch failure fails the scan outright, so bound the requests —
// a stalled connection must not hang the gate.
const SOURCE_FETCH_TIMEOUT_MS = 30_000;

const fetchSourceInfo = async (packageName, version) => {
	const { data } = await axios.get(`${registry}-/npm/v1/attestations/${packageName}@${version}`, {
		timeout: SOURCE_FETCH_TIMEOUT_MS,
	});
	return parseSourceRepo(data.attestations);
};

/**
 * Finds the directory inside a source checkout whose package.json declares
 * the given package name — handles both single-package repos and monorepos.
 */
export const findPackageRoot = (sourceDir, packageName) => {
	const packageJsonPaths = glob.sync('**/package.json', {
		cwd: sourceDir,
		absolute: true,
		ignore: ['**/node_modules/**'],
	});

	for (const packageJsonPath of packageJsonPaths) {
		try {
			if (JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).name === packageName) {
				return path.dirname(packageJsonPath);
			}
		} catch {
			// Unparseable package.json (e.g. a fixture) — keep looking
		}
	}

	return null;
};

const downloadAndExtractSource = async ({ owner, repo, gitCommit }, packageName) => {
	const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${gitCommit}`;
	const { data } = await axios.get(url, {
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
export const buildScanConfig = async () => {
	const { n8nCommunityNodesPlugin } = await import('@n8n/eslint-plugin-community-nodes');
	const tsParser = await import('@typescript-eslint/parser');
	const n8nNodesPlugin = (await import('eslint-plugin-n8n-nodes-base')).default;

	const parser = tsParser.default ?? tsParser;

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
	packageDir,
	filePatterns = ['**/*.js', '**/*.ts', '**/*.json'],
) => {
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
	} catch (error) {
		console.error(error);
		return {
			passed: false,
			message: `Analysis failed: ${error.message}`,
			error,
		};
	}
};

export const analyzePackageByName = async (packageName, version) => {
	try {
		let exactVersion = version;
		let packageMetadata;

		// If version is a range, get the latest matching version
		if (version && semver.validRange(version) && !semver.valid(version)) {
			const { data } = await axios.get(`${registry}/${packageName}`);
			packageMetadata = data;
			const versions = Object.keys(data.versions);
			exactVersion = semver.maxSatisfying(versions, version);

			if (!exactVersion) {
				throw new Error(`No version found matching ${version}`);
			}
		}

		// If no version specified, get the latest
		if (!exactVersion) {
			const { data } = await axios.get(`${registry}/${packageName}`);
			packageMetadata = data;
			exactVersion = data['dist-tags'].latest;
		}

		packageMetadata ??= (await axios.get(`${registry}/${packageName}`)).data;
		exactVersion = packageMetadata['dist-tags']?.[exactVersion] ?? exactVersion;
		const label = `${packageName}@${exactVersion}`;

		stdout.write(`Checking provenance for ${label}...`);
		const provenanceResult = checkPackageProvenance(packageMetadata, exactVersion);
		if (stdout.TTY) {
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
		let sourceDir = null;
		let sourceInfo = null;
		let sourceError = null;
		try {
			sourceInfo = await fetchSourceInfo(packageName, exactVersion);
			if (sourceInfo) {
				sourceDir = await downloadAndExtractSource(sourceInfo, packageName);
			}
		} catch (error) {
			sourceError = error;
		}
		if (stdout.TTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}

		if (!sourceDir) {
			const reason = sourceError?.message ?? 'unsupported or unlocatable source repository';
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
		if (stdout.TTY) {
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
		const analysisResult = {
			passed: sourceResult.passed && distResult.passed,
			message: [sourceResult, distResult].find((r) => !r.passed)?.message,
			details: [sourceResult.details, distResult.details].filter(Boolean).join('\n') || undefined,
		};
		if (stdout.TTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}
		stdout.write(`✅ Analyzed ${label} \n`);

		return {
			packageName,
			version: exactVersion,
			...analysisResult,
		};
	} catch (error) {
		console.error(`Failed to analyze ${packageName}@${version}:`, error);
		return {
			packageName,
			version,
			passed: false,
			message: `Analysis failed: ${error.message}`,
		};
	}
};
