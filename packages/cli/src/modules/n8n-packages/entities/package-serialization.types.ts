// Entity properties only; methods are ignored.
type EntityDataKeys<TEntity> = {
	[K in keyof TEntity]-?: TEntity[K] extends (...args: never[]) => unknown ? never : K;
}[keyof TEntity];

// Forces every entity property to be classified for export.
export type PackageEntityKeyHandling<TEntity> = Record<
	EntityDataKeys<TEntity>,
	'copy' | 'transform' | 'exclude'
>;

// Entity keys exported unchanged (copy key handling).
type PackageCopiedEntityKeys<TEntity, TKeyHandling extends PackageEntityKeyHandling<TEntity>> = {
	[K in EntityDataKeys<TEntity>]-?: TKeyHandling[K] extends 'copy' ? K : never;
}[EntityDataKeys<TEntity>];

// Entity keys intentionally omitted from export (exclude key handling).
type PackageExcludedEntityKeys<TEntity, TKeyHandling extends PackageEntityKeyHandling<TEntity>> = {
	[K in EntityDataKeys<TEntity>]-?: TKeyHandling[K] extends 'exclude' ? K : never;
}[EntityDataKeys<TEntity>];

// Copied entity keys absent from the inferred payload.
type CopiedEntityKeysMissingFromPayload<
	TEntity,
	TKeyHandling extends PackageEntityKeyHandling<TEntity>,
	TPayload,
> = Exclude<PackageCopiedEntityKeys<TEntity, TKeyHandling>, keyof TPayload>;

// Preserves exact payload keys while enforcing the export decisions and serialized schema.
export function definePackageSerializationPayload<
	TEntity,
	TSerialized extends object,
	TKeyHandling extends PackageEntityKeyHandling<TEntity>,
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
