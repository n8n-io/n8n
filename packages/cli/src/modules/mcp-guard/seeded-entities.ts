import { isRecord } from './gym-admin';

type Entity = Record<string, unknown>;

// The entities under native.<service>.<collection>[] of an overlay.
function collections(overlay: Record<string, unknown>): Array<[Record<string, unknown>, string]> {
	const { native } = overlay;
	if (!isRecord(native)) return [];
	return Object.values(native)
		.filter(isRecord)
		.flatMap((service) =>
			Object.entries(service)
				.filter(([, items]) => Array.isArray(items))
				.map(([name]): [Record<string, unknown>, string] => [service, name]),
		);
}

function entities(service: Record<string, unknown>, name: string): Entity[] {
	const items = service[name];
	return Array.isArray(items) ? items.filter(isRecord) : [];
}

const keyOf = (entity: Entity): string | undefined => {
	const key = typeof entity.id === 'string' ? entity.id : entity.ref;
	return typeof key === 'string' && key !== '' ? key.toLowerCase() : undefined;
};

/**
 * The entities that code seeded into the gym tenant of one chat. The gym refuses a seed that names
 * an id it already holds, and the model does not know what the tenant holds. This list lets code
 * leave those entities out, and write a reference to one with the ref that the gym stored.
 */
export class SeededEntities {
	// id (or ref, when there is no id) in lower case -> the ref that the gym stored
	private readonly seeded = new Map<string, string>();

	// Refs in lower case -> the stored ref. A model may write `team:lho` for `team:LHO`.
	private readonly refs = new Map<string, string>();

	/** Removes the entities that the tenant has. Returns what is left to seed. */
	dedupe(overlay: Record<string, unknown>): Record<string, unknown> {
		if (this.seeded.size === 0) return overlay;
		const next: Record<string, unknown> = structuredClone(overlay);
		for (const [service, name] of collections(next)) {
			service[name] = entities(service, name).filter((entity) => {
				const key = keyOf(entity);
				return key === undefined || !this.seeded.has(key);
			});
		}
		return this.fixRefs(next) as Record<string, unknown>;
	}

	/** Notes the entities of an overlay that the gym took. */
	record(overlay: Record<string, unknown>): void {
		for (const [service, name] of collections(overlay)) {
			for (const entity of entities(service, name)) {
				const key = keyOf(entity);
				if (key === undefined) continue;
				const ref = typeof entity.ref === 'string' ? entity.ref : key;
				this.seeded.set(key, ref);
				this.refs.set(ref.toLowerCase(), ref);
			}
		}
	}

	// A string that names a stored ref in other letter case gets the stored ref. The ref of an entity stays.
	private fixRefs(value: unknown, key?: string): unknown {
		if (typeof value === 'string') {
			const stored = this.refs.get(value.toLowerCase());
			return stored !== undefined && key !== 'ref' && key !== 'id' ? stored : value;
		}
		if (Array.isArray(value)) return value.map((item) => this.fixRefs(item, key));
		if (isRecord(value)) {
			return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.fixRefs(v, k)]));
		}
		return value;
	}

	/** True when the overlay has no entity and nothing else to seed. */
	static isEmpty(overlay: Record<string, unknown>): boolean {
		const { world_version: _version, native, ...rest } = overlay;
		if (Object.keys(rest).length > 0) return false;
		if (!isRecord(native)) return true;
		return Object.values(native).every(
			(service) =>
				isRecord(service) &&
				Object.values(service).every((items) => Array.isArray(items) && items.length === 0),
		);
	}
}
