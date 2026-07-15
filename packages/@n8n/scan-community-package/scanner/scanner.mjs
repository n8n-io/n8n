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

import { checkPackageProvenance, getSourceLocation } from './provenance.mjs';

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

const cloneSourcePackage = (repoUrl, commitSha) => {
	if (!/^https?:\/\//.test(repoUrl)) {
		throw new Error(`Refusing to clone non-http(s) source URL: ${repoUrl}`);
	}
	if (!/^[0-9a-f]{7,40}$/.test(commitSha)) {
		throw new Error(`Invalid commit SHA from provenance: ${commitSha}`);
	}

	const repoDir = safeJoinPath(TEMP_DIR, commitSha);
	fs.rmSync(repoDir, { recursive: true, force: true });
	const cloneResult = spawnSync('git', ['clone', '--quiet', repoUrl, repoDir], {
		stdio: 'pipe',
		shell: process.platform === 'win32',
	});
	if (cloneResult.status !== 0) {
		throw new Error(`git clone failed: ${cloneResult.stderr?.toString()}`);
	}
	// Checkout the exact attested commit so the scan covers what was built,
	// not whatever the default branch points at by scan time.
	const checkoutResult = spawnSync('git', ['-C', repoDir, 'checkout', '--quiet', commitSha], {
		stdio: 'pipe',
		shell: process.platform === 'win32',
	});
	if (checkoutResult.status !== 0) {
		throw new Error(`git checkout ${commitSha} failed: ${checkoutResult.stderr?.toString()}`);
	}
	return repoDir;
};

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
		// below are kept identical. The gate lints the **source** of the package
		// (cloned from the provenance-attested git commit), not the compiled
		// `dist/` output the tarball ships — the official template sets
		// `files: ["dist"]`, so source is not in the tarball, and the AST-walking
		// rules no-op on compiled `.d.ts`/`.js` (the description AST is a type
		// annotation there, not a literal). `analyzePackage` ignores `dist/` and
		// `.git/`, matching `n8n-node lint`'s `globalIgnores(['dist'])`.
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
		// the cloned `.ts` sources need the TS parser.
		{
			files: ['**/*.ts'],
			languageOptions: { parser },
		},
	);
};

/**
 * Selects the files the gate lints inside a (cloned) source tree: authored
 * `.ts` + `.json`, excluding build output (`dist/`), VCS metadata (`.git/`),
 * deps (`node_modules/`), and lockfiles. Exported so the source-vs-compiled
 * selection can be unit-tested without running ESLint (the external
 * `n8n-nodes-base` parser instance no-ops under vitest — see `buildScanConfig`).
 */
export const collectLintFiles = (packageDir) =>
	glob.sync(['**/*.ts', '**/*.json'], {
		cwd: packageDir,
		absolute: true,
		ignore: ['node_modules/**', 'dist/**', '.git/**', '**/package-lock.json'],
	});

export const analyzePackage = async (packageDir) => {
	const eslint = new ESLint({
		cwd: packageDir,
		allowInlineConfig: false,
		overrideConfigFile: true,
		overrideConfig: await buildScanConfig(),
	});

	try {
		// `n8n-node lint` lints `**/*.ts` + `package.json`. The gate lints the
		// cloned SOURCE, so ignore committed build output + VCS metadata (mirrors
		// `n8n-node lint`'s `globalIgnores(['dist'])`). `.js` is deliberately
		// excluded: published packages ship only `dist/` (the official template
		// sets `files: ["dist"]`), and linting authored `.js` (e.g. gulpfile.js)
		// trips rules like `no-restricted-imports` that are meaningless there.
		const filesToLint = collectLintFiles(packageDir);

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

		stdout.write(`Locating source for ${label}...`);
		const sourceLocation = await getSourceLocation(packageMetadata, exactVersion);
		if (stdout.TTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}
		if (!sourceLocation) {
			stdout.write(
				`❌ Could not determine source repository from provenance attestation for ${label} \n`,
			);
			return {
				packageName,
				version: exactVersion,
				passed: false,
				message:
					'Could not determine source repository and commit from the npm provenance attestation',
			};
		}
		stdout.write(
			`✅ Source located: ${sourceLocation.repoUrl}@${sourceLocation.commitSha.slice(0, 7)} \n`,
		);

		stdout.write(`Cloning source for ${label}...`);
		const packageDir = cloneSourcePackage(sourceLocation.repoUrl, sourceLocation.commitSha);
		if (stdout.TTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}
		stdout.write(`✅ Cloned ${label} \n`);

		stdout.write(`Analyzing ${label}...`);
		const analysisResult = await analyzePackage(packageDir);
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
