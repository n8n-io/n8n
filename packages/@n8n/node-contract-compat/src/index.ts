export {
	deriveManifests,
	type CompileKind,
	type CompileMap,
	type DerivedAction,
	type DerivedVersion,
	type DeriveIssue,
	type DeriveIssueKind,
	type DeriveOptions,
	type DeriveShape,
	type FieldCounts,
	type LegacyTarget,
	type OutputSchemaLookup,
} from './derive/derive';
export { fromLegacyParameters, toLegacyParameters } from './derive/round-trip';
export { migrateVersion, type MigratedSlot, type MigrateVersionOptions } from './migrate/migrate';
