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

import { checkPackageProvenance } from './provenance.mjs';

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
		// below are kept identical. Scoping differs on purpose: `n8n-node lint`
		// runs at dev-time on `nodes/**` / `credentials/**` `.ts` sources, but
		// published tarballs ship compiled output under `dist/` (e.g.
		// `dist/nodes/Foo/Foo.node.js` + `.d.ts`). We match `nodes`/`credentials`
		// dirs at any depth and target `.ts`/`.d.ts` only — the AST-walking rules
		// resolve against the type-preserving `.d.ts`. Compiled `.js` is
		// deliberately excluded: the description AST is buried in a constructor
		// there so the rules no-op, and file-shape rules like
		// node-filename-against-convention would false-positive on the `.js`
		// extension (that check is meaningful only against `.ts` sources at
		// dev-time). Without the `dist/`-aware glob these rules never run at the
		// gate at all.
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

export const analyzePackage = async (packageDir) => {
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
		const filesToLint = glob.sync(['**/*.js', '**/*.ts', '**/*.json'], {
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

		stdout.write(`Downloading ${label}...`);
		const packageDir = await downloadAndExtractPackage(packageName, exactVersion);
		if (stdout.TTY) {
			stdout.clearLine(0);
			stdout.cursorTo(0);
		}
		stdout.write(`✅ Downloaded ${label} \n`);

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
