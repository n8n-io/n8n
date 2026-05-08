import type { PackageRequirements } from './requirements.types';
import type { ManifestProjectEntry } from './serialized/project.serialized';

// ---------------------------------------------------------------------------
// Entity keys — the canonical list of entity types in a package
// ---------------------------------------------------------------------------

export const ENTITY_KEYS = [
	'folders',
	'workflows',
	'credentials',
	'variables',
	'dataTables',
	'tags',
] as const;
export type EntityKey = (typeof ENTITY_KEYS)[number];

// ---------------------------------------------------------------------------
// Manifest entry — a single entity reference in the package manifest
// ---------------------------------------------------------------------------

export interface ManifestEntry {
	id: string;
	name: string;
	target: string;

	// --- Reserved for v2; ignored by v1 readers but emitted by v2 producers. ---

	/** Content digest for tamper detection (e.g. "sha256:..."). */
	digest?: string;
	/** Uncompressed size of the entry's content, in bytes. */
	size?: number;
}

// ---------------------------------------------------------------------------
// Entity entries — the typed result of running the export/import pipeline
// ---------------------------------------------------------------------------

export type EntityEntries = Record<EntityKey, ManifestEntry[]>;

// ---------------------------------------------------------------------------
// Package manifest
// ---------------------------------------------------------------------------

export interface PackageManifest {
	packageFormatVersion: string;
	exportedAt: string;
	sourceN8nVersion: string;
	sourceId: string;

	/** Project-scoped exports */
	projects?: ManifestProjectEntry[];

	/** Top-level standalone exports (not scoped to a project) */
	workflows?: ManifestEntry[];
	folders?: ManifestEntry[];
	credentials?: ManifestEntry[];
	variables?: ManifestEntry[];
	dataTables?: ManifestEntry[];
	tags?: ManifestEntry[];

	/** Dependencies that workflows require but are not included in the package */
	requirements?: PackageRequirements;

	// --- Reserved for v2; ignored by v1 readers but emitted by v2 producers. ---
	// These fields exist on the type so v1 consumers tolerate v2 packages
	// (forward compatibility) and v1 producers can emit them deliberately
	// without bumping the format version. v1 enforces nothing on them.

	/** Content type identifier (e.g. "application/vnd.n8n.package+gzip"). */
	mediaType?: string;
	/** Discriminator for package variants ("ProjectPackage" | "FolderPackage" | "WorkflowPackage" | ...). */
	kind?: string;
	/** Digest of the manifest payload for tamper detection. */
	packageDigest?: string;
	/** Detached signatures over the manifest. */
	signatures?: unknown[];
	/** Build-provenance attestations (SLSA, in-toto, etc.). */
	attestations?: unknown[];
	/** Engine requirements that the target instance must satisfy. */
	requires?: {
		n8nVersion?: string;
	};
}
