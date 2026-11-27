import { isRecord } from '@n8n/utils/is-record';

type Entity = Record<string, unknown>;

const MAX_DEPTH = 6;

// The lists of entities in an overlay: native.<service>.<collection>[], and lists nested in them
// (the comments of an issue). Each item is [the object that holds the list, the list's name].
function collections(overlay: Record<string, unknown>): Array<[Record<string, unknown>, string]> {
	const found: Array<[Record<string, unknown>, string]> = [];
	const visit = (holder: Record<string, unknown>, depth: number) => {
		for (const [name, value] of Object.entries(holder)) {
			if (Array.isArray(value) && value.some(isRecord)) {
				found.push([holder, name]);
				if (depth < MAX_DEPTH) value.filter(isRecord).forEach((item) => visit(item, depth + 1));
			} else if (isRecord(value) && depth < MAX_DEPTH) {
				visit(value, depth + 1);
			}
		}
	};
	if (isRecord(overlay.native)) visit(overlay.native, 0);
	return found;
}

function entities(service: Record<string, unknown>, name: string): Entity[] {
	const items = service[name];
	return Array.isArray(items) ? items.filter(isRecord) : [];
}

// An entity that lists other entities, such as the rows of a database.
const hasChildren = (entity: Entity): boolean =>
	Object.values(entity).some((value) => Array.isArray(value) && value.some(isRecord));

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
	/**
	 * keepParents: the gym takes a seed of an entity that it has and adds the new children (the rows of
	 * a Notion database). Then an entity with new children stays in the seed. Without it the entity goes.
	 */
	constructor(private readonly options: { keepParents?: boolean } = {}) {}

	// id (or ref, when there is no id) in lower case -> the ref that the gym stored
	private readonly seeded = new Map<string, string>();

	// Refs in lower case -> the stored ref. A model may write `team:lho` for `team:LHO`.
	private readonly refs = new Map<string, string>();

	// `<collection>:<key>` in lower case -> the stored ref. A team key is unique, also when the id differs.
	private readonly byKey = new Map<string, string>();

	// Keys of entities that a list result seeded. A list shows less than the entity has.
	private readonly shallow = new Set<string>();

	// Ids of objects that the gym made itself, for example the issue that an agent created.
	private readonly held = new Set<string>();

	/** Forgets everything, for a tenant that the gym lost. */
	clear(): void {
		this.seeded.clear();
		this.refs.clear();
		this.byKey.clear();
		this.shallow.clear();
		this.held.clear();
	}

	/** Notes ids that the gym holds, so a plan does not seed another object under them. */
	hold(ids: string[]): void {
		for (const id of ids) this.held.add(id.toLowerCase());
	}

	private holds(key: string): boolean {
		return (
			this.seeded.has(key) || [...this.held].some((id) => key === id || key.endsWith(`:${id}`))
		);
	}

	/** True when the gym holds every id: the call names nothing that needs hydration. Dashes and case do not matter. */
	knows(ids: string[]): boolean {
		const squash = (id: string) => id.toLowerCase().replace(/-/g, '');
		const keys = [...this.seeded.keys(), ...this.held].map(squash);
		return ids.every((id) => keys.some((key) => key === id || key.endsWith(`:${id}`)));
	}

	/**
	 * Removes the entities that the tenant has. Returns what is left to seed.
	 * detail: the overlay comes from a call that shows whole entities. It replaces an entity that
	 * only a list seeded.
	 */
	dedupe(overlay: Record<string, unknown>, detail = false): Record<string, unknown> {
		if (this.seeded.size === 0 && this.held.size === 0) return overlay;
		const next: Record<string, unknown> = structuredClone(overlay);
		// Children first, so a parent is judged by the children that are left.
		for (const [service, name] of collections(next).reverse()) {
			service[name] = entities(service, name).filter((entity) => {
				const key = keyOf(entity);
				const heldAlready = key !== undefined && this.holds(key);
				const stored = this.byKey.get(this.keyName(name, entity));
				if (!heldAlready && stored === undefined) return true;
				if (detail && key !== undefined && this.shallow.has(key)) {
					// Seed it again under the stored ref, so the gym updates the entity.
					const ref = this.seeded.get(key);
					if (ref !== undefined && typeof entity.ref === 'string') entity.ref = ref;
					return true;
				}
				// Another ref for the same object: references to it use the stored ref.
				if (!heldAlready && typeof entity.ref === 'string') {
					this.refs.set(entity.ref.toLowerCase(), stored ?? entity.ref);
				}
				return this.options.keepParents === true && hasChildren(entity);
			});
		}
		return this.fixRefs(next) as Record<string, unknown>;
	}

	private keyName(collection: string, entity: Entity): string {
		return typeof entity.key === 'string' ? `${collection}:${entity.key.toLowerCase()}` : '';
	}

	/** Notes the entities of an overlay that the gym took. shallow: a list result is the source. */
	record(overlay: Record<string, unknown>, shallow = false): void {
		for (const [service, name] of collections(overlay)) {
			for (const entity of entities(service, name)) {
				const key = keyOf(entity);
				if (key === undefined) continue;
				const ref = typeof entity.ref === 'string' ? entity.ref : key;
				this.seeded.set(key, ref);
				if (shallow) this.shallow.add(key);
				else this.shallow.delete(key);
				if (typeof entity.key === 'string') this.byKey.set(this.keyName(name, entity), ref);
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
