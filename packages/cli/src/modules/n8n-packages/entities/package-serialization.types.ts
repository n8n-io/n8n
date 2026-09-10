/**
 * The types below are hairy, but they exist for one reason: whenever a field is added to,
 * renamed on, or removed from a core entity (workflow, credential, ...), package import/export
 * must be updated too. Each serializer declares an export decision (`copy`, `transform`,
 * `exclude`) for every entity key, and these types turn any drift between the entity and its
 * decisions into a compile error — instead of silently dropping data from packages.
 */
import type { JoinKeys } from '@n8n/utils/types';

// Entity properties only; methods are ignored.
type EntityDataKeys<TEntity> = {
	[K in keyof TEntity]-?: TEntity[K] extends (...args: never[]) => unknown ? never : K;
}[keyof TEntity];

// Forces every entity property to be classified for export.
type PackageEntityKeyHandling<TEntity> = Record<
	EntityDataKeys<TEntity>,
	'copy' | 'transform' | 'exclude'
>;

// Turns into a readable constraint error in two cases:
// - entity keys without a decision (e.g. `nodeGroups` added to the entity but not here)
// - decisions for keys not on the entity (e.g. `nodeGroups` renamed but still listed here)
type ExportDecisionConstraint<TEntity, TKeyHandling> = [
	Exclude<EntityDataKeys<TEntity>, keyof TKeyHandling>,
] extends [never]
	? [Exclude<keyof TKeyHandling, EntityDataKeys<TEntity>>] extends [never]
		? PackageEntityKeyHandling<TEntity>
		: `Export decisions include key(s) that do not exist on the entity: ${JoinKeys<
				Extract<Exclude<keyof TKeyHandling, EntityDataKeys<TEntity>>, string>
			>}`
	: `Every entity key has a package export decision, missing export decision for key(s): ${JoinKeys<
			Extract<Exclude<EntityDataKeys<TEntity>, keyof TKeyHandling>, string>
		>}`;

// Entity keys exported unchanged (copy key handling).
type PackageCopiedEntityKeys<TEntity, TKeyHandling> = {
	[K in EntityDataKeys<TEntity>]-?: K extends keyof TKeyHandling
		? TKeyHandling[K] extends 'copy'
			? K
			: never
		: never;
}[EntityDataKeys<TEntity>];

// Entity keys intentionally omitted from export (exclude key handling).
type PackageExcludedEntityKeys<TEntity, TKeyHandling> = {
	[K in EntityDataKeys<TEntity>]-?: K extends keyof TKeyHandling
		? TKeyHandling[K] extends 'exclude'
			? K
			: never
		: never;
}[EntityDataKeys<TEntity>];

// Copied entity keys absent from the inferred payload.
type CopiedEntityKeysMissingFromPayload<TEntity, TKeyHandling, TPayload> = Exclude<
	PackageCopiedEntityKeys<TEntity, TKeyHandling>,
	keyof TPayload
>;

// Preserves exact payload keys while enforcing the export decisions and serialized schema.
// The handling map must give every entity key a decision, or this fails to compile with a
// message listing the undecided keys.
export function definePackageSerializationPayload<
	TEntity,
	TSerialized extends object,
	TKeyHandling extends ExportDecisionConstraint<TEntity, TKeyHandling>,
>() {
	return <const TPayload extends TSerialized>(
		payload: TPayload &
			// Every copied key must be present, including optional keys.
			Record<CopiedEntityKeysMissingFromPayload<TEntity, TKeyHandling, TPayload>, never> &
			// Excluded entity keys cannot be emitted.
			Partial<Record<PackageExcludedEntityKeys<TEntity, TKeyHandling>, never>> &
			// Payload keys must exist in the serialized schema.
			Record<Exclude<keyof TPayload, keyof TSerialized>, never>,
	): TPayload => payload;
}
