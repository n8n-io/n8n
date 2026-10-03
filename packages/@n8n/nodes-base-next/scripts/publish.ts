import type { Action, Trigger } from '@n8n/node-sdk';
import { parseFixtures, type StoreStatusRecord } from '@n8n/node-sdk/registry';
import {
	publishAction,
	publishCredential,
	publishNative,
	publishStatus,
} from '@n8n/node-sdk/publish';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserError } from 'n8n-workflow';

import { credentialTypes } from '../src/index';
import { actionEntries, natives } from './freeze';

export const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/** The fixtures of a contract. A trigger replays only migration pairs, so it may have no file. */
async function fixturesOf(action: Action | Trigger) {
	const file = path.join(FIXTURES_DIR, `${action.id}.json`);
	if ('kind' in action && !existsSync(file)) return undefined;
	return parseFixtures(await readFile(file, 'utf8'));
}

/** The registry folder and the signing key, from the environment. */
async function publishTarget() {
	const url = process.env.N8N_NODE_CONTRACTS_REGISTRY_URL;
	const keyFile = process.env.N8N_NODE_CONTRACTS_SIGNING_KEY_FILE;
	if (!url?.startsWith('file:') || !keyFile) {
		throw new UserError(
			'Set N8N_NODE_CONTRACTS_REGISTRY_URL to a file:// folder and N8N_NODE_CONTRACTS_SIGNING_KEY_FILE',
		);
	}
	return { registryDir: fileURLToPath(url), privateKey: await readFile(keyFile, 'utf8') };
}

const STATUS_USAGE = [
	'pnpm publish:contracts yank <id>@<version> <reason>',
	'pnpm publish:contracts revoke <id>@<version> <reason>',
	'pnpm publish:contracts deprecate <id>@<major[.minor[.patch]]> <message> [<use>]',
].join('\n');

/** The status line of the command line arguments `<yank|revoke|deprecate> <id>@<version> <text> [<use>]`. */
function statusOfArgs(args: readonly string[], at: string): StoreStatusRecord {
	const [command, target = '', text, use] = args;
	const separator = target.lastIndexOf('@');
	const id = target.slice(0, separator);
	const version = target.slice(separator + 1);
	if (separator <= 0 || !version || !text) throw new UserError(`Usage:\n${STATUS_USAGE}`);
	if (command === 'yank') return { id, yank: version, reason: text, at };
	if (command === 'revoke') return { id, revoke: version, reason: text, at };
	if (command === 'deprecate') {
		return { id, deprecate: version, message: text, ...(use ? { use } : {}), at };
	}
	throw new UserError(`Usage:\n${STATUS_USAGE}`);
}

/**
 * Publishes the HEAD of each action and trigger, each credential type that is not a compat type,
 * and each native contract into the registry store. The registry serves these files as they are,
 * so the URL is a `file://` folder that a static upload copies. The gate of each kind refuses a
 * wrong bump; a version already published with the same content is a no-op.
 */
async function publishAll() {
	const target = await publishTarget();
	const log = ({ id, semver }: { readonly id: string; readonly semver: string }) =>
		console.log(`${id}@${semver}`);
	// One at a time: each version appends to the registry index, and the log stays readable.
	for (const type of credentialTypes) log(await publishCredential({ ...target, type }));
	for (const { entryFile, exportName, action } of await actionEntries()) {
		const fixtures = await fixturesOf(action);
		log(await publishAction({ ...target, entryFile, exportName, fixtures }));
	}
	for (const native of natives) log(await publishNative({ ...target, native }));
}

/** With arguments, signs and appends one status line. Without arguments, publishes all versions. */
async function main(args: readonly string[]) {
	if (args.length === 0) return await publishAll();
	const status = statusOfArgs(args, new Date().toISOString());
	console.log(JSON.stringify(await publishStatus(await publishTarget(), status)));
}

if (require.main === module) {
	void main(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
