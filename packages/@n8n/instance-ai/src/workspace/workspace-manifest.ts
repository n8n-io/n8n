import { isRecord } from '@n8n/utils';

export const WORKSPACE_MANIFEST_FILE = '.manifest.json';

export interface VersionedWorkspaceManifest<THashField extends string = string> {
	schemaVersion: number;
	hashField: THashField;
	hash: string;
}

interface ParseVersionedWorkspaceManifestOptions<THashField extends string> {
	schemaVersion: number;
	hashField: THashField;
}

/** Parse a versioned workspace manifest and validate its hash field. */
export function parseVersionedWorkspaceManifest<const THashField extends string>(
	raw: string,
	options: ParseVersionedWorkspaceManifestOptions<THashField>,
): VersionedWorkspaceManifest<THashField> | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isRecord(parsed)) return null;
	if (parsed.schemaVersion !== options.schemaVersion) return null;

	const hash = parsed[options.hashField];
	if (typeof hash !== 'string' || hash.length === 0) return null;

	return {
		schemaVersion: options.schemaVersion,
		hashField: options.hashField,
		hash,
	};
}
