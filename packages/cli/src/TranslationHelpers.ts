import { join, dirname } from 'path';
import { readdir } from 'fs/promises';
import { Dirent } from 'fs';

const ALLOWED_VERSIONED_DIRNAME_LENGTH = [2, 3]; // v1, v10

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

export async function getNodeTranslationPath(
	sourcePath: string,
	nodeType: string,
	language: string,
): Promise<string> {
	const nodeDir = dirname(sourcePath);
	const shortNodeType = nodeType.replace('n8n-nodes-base.', '');
	const maxVersion = await getMaxVersion(nodeDir);

	return maxVersion
		? join(nodeDir, `v${maxVersion}`, 'translations', language, `${shortNodeType}.json`)
		: join(nodeDir, 'translations', language, `${shortNodeType}.json`);
}

export function getCredentialTranslationPath({
	locale,
	credentialType,
}: {
	locale: string;
	credentialType: string;
}): string {
	const packagesPath = join(__dirname, '..', '..', '..');
	const credsPath = join(packagesPath, 'nodes-base', 'dist', 'credentials');

	return join(credsPath, 'translations', locale, `${credentialType}.json`);
}
