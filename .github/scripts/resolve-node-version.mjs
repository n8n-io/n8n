#!/usr/bin/env node
// Publishes the Node version for setup-nodejs to `$GITHUB_OUTPUT`. A job that
// asks for no version gets NODE_VERSION of docker/docker-bake.hcl, the Node of
// the images, so a Node update changes one line. Node builtins only: it runs
// before setup-node.

import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Resolved from this file so the cwd does not matter. */
export const BAKE_FILE = new URL('../../docker/docker-bake.hcl', import.meta.url);

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * @param {string} hcl
 * @returns {string}
 */
export function readNodeVersion(hcl) {
	const version = /^variable "NODE_VERSION" \{ default = "([^"]+)" \}$/m.exec(hcl)?.[1];
	if (!version || !VERSION_PATTERN.test(version)) {
		throw new Error(`docker-bake.hcl pins no exact NODE_VERSION (got '${version ?? ''}')`);
	}
	return version;
}

/**
 * @param {object} [options]
 * @param {string} [options.requested] The version that the job asks for, or empty.
 * @param {URL | string} [options.bakeFile]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @returns {string}
 */
export function resolveNodeVersion({
	requested = process.env.REQUESTED_NODE_VERSION ?? '',
	bakeFile = BAKE_FILE,
	env = process.env,
} = {}) {
	const version = requested || readNodeVersion(readFileSync(bakeFile, 'utf8'));

	if (env.GITHUB_OUTPUT) {
		appendFileSync(env.GITHUB_OUTPUT, `version=${version}\n`, 'utf8');
	}

	return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		console.log(`Node ${resolveNodeVersion()}`);
	} catch (error) {
		console.error(`::error::${error.message}`);
		process.exit(1);
	}
}
