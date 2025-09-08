#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { ESLint } from "eslint";
import { spawnSync } from "child_process";
import tmp from "tmp";
import semver from "semver";
import axios from "axios";
import glob from "fast-glob";
import { fileURLToPath } from "url";
import { defineConfig } from "eslint/config";

import plugin from "./eslint-plugin.mjs";

const { stdout } = process;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = tmp.dirSync({ unsafeCleanup: true }).name;
const registry = "https://registry.npmjs.org/";

export const resolvePackage = (packageSpec) => {
	// Validate input to prevent command injection
	if (!/^[a-zA-Z0-9@/_.-]+$/.test(packageSpec)) {
		throw new Error('Invalid package specification');
	}

	let packageName, version;
	if (packageSpec.startsWith("@")) {
		if (packageSpec.includes("@", 1)) {
			// Handle scoped packages with versions
			const lastAtIndex = packageSpec.lastIndexOf("@");
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
	const parts = packageSpec.split("@");
	return { packageName: parts[0], version: parts[1] || null };
};

const downloadAndExtractPackage = async (packageName, version) => {
	try {
		// Download the tarball using safe arguments
		const npmResult = spawnSync('npm', ['-q', 'pack', `${packageName}@${version}`], { 
			cwd: TEMP_DIR,
			stdio: 'pipe'
		});
		if (npmResult.status !== 0) {
			throw new Error(`npm pack failed: ${npmResult.stderr?.toString()}`);
		}
		const tarballName = fs
			.readdirSync(TEMP_DIR)
			.find((file) => file.endsWith(".tgz"));
		if (!tarballName) {
			throw new Error("Tarball not found");
		}

		// Unpack the tarball
		const packageDir = path.join(TEMP_DIR, `${packageName}-${version}`);
		fs.mkdirSync(packageDir, { recursive: true });
		const tarResult = spawnSync('tar', ['-xzf', tarballName, '-C', packageDir, '--strip-components=1'], {
			cwd: TEMP_DIR,
			stdio: 'pipe'
		});
		if (tarResult.status !== 0) {
			throw new Error(`tar extraction failed: ${tarResult.stderr?.toString()}`);
		}
		fs.unlinkSync(path.join(TEMP_DIR, tarballName));

		return packageDir;
	} catch (error) {
		console.error(`\nFailed to download package: ${error.message}`);
		throw error;
	}
};

const analyzePackage = async (packageDir) => {
	const { default: eslintPlugin } = await import("./eslint-plugin.mjs");
	const eslint = new ESLint({
		cwd: packageDir,
		allowInlineConfig: false,
		overrideConfigFile: true,
		overrideConfig: defineConfig([
			{
				plugins: {
					"n8n-community-packages": plugin,
				},
				rules: {
					"n8n-community-packages/no-restricted-globals": "error",
					"n8n-community-packages/no-restricted-imports": "error",
				},
				languageOptions: {
					parserOptions: {
						ecmaVersion: 2022,
						sourceType: "commonjs",
					},
				},
			},
		]),
	});

	try {
		const jsFiles = glob.sync("**/*.js", {
			cwd: packageDir,
			absolute: true,
			ignore: ["node_modules/**"],
		});

		if (jsFiles.length === 0) {
			return { passed: true, message: "No JavaScript files found to analyze" };
		}

		const results = await eslint.lintFiles(jsFiles);
		const violations = results.filter((result) => result.errorCount > 0);

		if (violations.length > 0) {
			const formatter = await eslint.loadFormatter("stylish");
			const formattedResults = await formatter.format(results);
			return {
				passed: false,
				message: "ESLint violations found",
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

		// If version is a range, get the latest matching version
		if (version && semver.validRange(version) && !semver.valid(version)) {
			const { data } = await axios.get(`${registry}/${packageName}`);
			const versions = Object.keys(data.versions);
			exactVersion = semver.maxSatisfying(versions, version);

			if (!exactVersion) {
				throw new Error(`No version found matching ${version}`);
			}
		}

		// If no version specified, get the latest
		if (!exactVersion) {
			const { data } = await axios.get(`${registry}/${packageName}`);
			exactVersion = data["dist-tags"].latest;
		}

		const label = `${packageName}@${exactVersion}`;

		stdout.write(`Downloading ${label}...`);
		const packageDir = await downloadAndExtractPackage(
			packageName,
			exactVersion,
		);
		if (stdout.TTY){
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
