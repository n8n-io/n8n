// ---------------------------------------------------------------------------
// Manifest entry — a single entity reference in the package manifest
// ---------------------------------------------------------------------------

export interface ManifestEntry {
	id: string;
	name: string;
	target: string;
}

// ---------------------------------------------------------------------------
// Package manifest — header for the .n8np bundle
// ---------------------------------------------------------------------------

export interface PackageManifest {
	packageFormatVersion: string;
	exportedAt: string;
	sourceN8nVersion: string;
	sourceId: string;

	workflows?: ManifestEntry[];
}
