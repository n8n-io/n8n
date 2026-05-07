import type { ManifestProjectEntry } from './serialized/project.serialized';
import type { PackageRequirements } from './requirements.types';

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
}
