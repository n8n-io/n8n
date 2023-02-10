import { join, dirname } from 'path';
import { readdir } from 'fs/promises';
import type { Dirent } from 'fs';
import { NODES_BASE_DIR } from '@/constants';

const ALLOWED_VERSIONED_DIRNAME_LENGTH = [2, 3]; // e.g. v1, v10

function isVersionedDirname(dirent: Dirent) {
	if (!dirent.isDirectory()) return false;

	return (
		ALLOWED_VERSIONED_DIRNAME_LENGTH.includes(dirent.name.length) &&
		dirent.name.toLowerCase().startsWith('v')
	);
}

async function getMaxVersion(from: string) {
	const entries = await readdir(from, { withFileTypes: true });

	const dirnames = entries.reduce<string[]>((acc, cur) => {
		if (isVersionedDirname(cur)) acc.push(cur.name);
		return acc;
	}, []);

	if (!dirnames.length) return null;

	return Math.max(...dirnames.map((d) => parseInt(d.charAt(1), 10)));
}

/**
 * Get the full path to a node translation file in `/dist`.
 */
export async function getNodeTranslationPath({
	nodeSourcePath,
	longNodeType,
	locale,
}: {
	nodeSourcePath: string;
	longNodeType: string;
	locale: string;
}): Promise<string> {
	const nodeDir = dirname(nodeSourcePath);
	const maxVersion = await getMaxVersion(nodeDir);
	const nodeType = longNodeType.replace('n8n-nodes-base.', '');

	return maxVersion
		? join(nodeDir, `v${maxVersion}`, 'translations', locale, `${nodeType}.json`)
		: join(nodeDir, 'translations', locale, `${nodeType}.json`);
}

/**
 * Get the full path to a credential translation file in `/dist`.
 */
export function getCredentialTranslationPath({
	locale,
	credentialType,
}: {
	locale: string;
	credentialType: string;
}): string {
	const credsPath = join(NODES_BASE_DIR, 'dist', 'credentials');

	return join(credsPath, 'translations', locale, `${credentialType}.json`);
}
