/**
 * Builds the world of a tenant: the example worlds of the services that a
 * workflow calls, merged into one world document (`00_seeding.md`).
 *
 * Merge rules: the persona of the first world; people, orgs and entities
 * once for each ref (the first wins); `placement` and `native` merged by key.
 * `timeline` is dropped, so that nothing happens in a tenant while the two
 * runs execute, and `now` is dropped, so that times are relative to the
 * tenant clock of the run.
 */
import type { GymAdmin } from './gym-admin.ts';
import { GymError } from './gym-admin.ts';
import type { JsonRecord } from './sample.ts';
import { isRecord } from './sample.ts';

function byRef(lists: unknown[][]): unknown[] {
	const seen = new Set<string>();
	const out: unknown[] = [];
	for (const list of lists) {
		for (const e of list) {
			const ref = isRecord(e) && typeof e.ref === 'string' ? e.ref : undefined;
			if (ref !== undefined) {
				if (seen.has(ref)) continue;
				seen.add(ref);
			}
			out.push(e);
		}
	}
	return out;
}

export function mergeWorlds(worlds: JsonRecord[]): JsonRecord {
	const list = (w: JsonRecord, k: string): unknown[] => (Array.isArray(w[k]) ? w[k] : []);
	const merged: JsonRecord = { world_version: 1 };
	const first = worlds[0] ?? {};
	if (isRecord(first.persona)) merged.persona = first.persona;
	if (typeof first.timezone === 'string') merged.timezone = first.timezone;
	for (const key of ['people', 'orgs', 'entities']) {
		const items = byRef(worlds.map((w) => list(w, key)));
		if (items.length > 0) merged[key] = items;
	}
	for (const key of ['placement', 'native']) {
		const out: JsonRecord = {};
		for (const w of worlds) {
			const v = w[key];
			if (!isRecord(v)) continue;
			for (const [k, x] of Object.entries(v)) if (!(k in out)) out[k] = x;
		}
		if (Object.keys(out).length > 0) merged[key] = out;
	}
	return merged;
}

export interface SeedResult {
	tenant: JsonRecord;
	/** Warnings of the seed report, and services without an example world. */
	warnings: string[];
}

/** Creates the tenant with the merged example worlds of the services. */
export async function seedTenant(
	gym: GymAdmin,
	tenant: string,
	services: string[],
): Promise<SeedResult> {
	const warnings: string[] = [];
	const worlds: JsonRecord[] = [];
	for (const s of services) {
		const w = await gym.example(s);
		if (w) worlds.push(w);
		else warnings.push(`${s}: no example world`);
	}
	const world = mergeWorlds(worlds);
	let doc: JsonRecord;
	try {
		doc = await gym.putTenant(tenant, { world, services, ttl_s: 3600 });
	} catch (e) {
		// Two example worlds can disagree (a ref that one declares and the other uses).
		// Then each world goes in on its own: the first with the tenant, the others as seeds.
		if (!(e instanceof GymError) || e.status !== 400 || worlds.length < 2) throw e;
		warnings.push(`merged world refused, seeded one by one: ${e.message.slice(0, 160)}`);
		doc = await gym.putTenant(tenant, { world: mergeWorlds([worlds[0]]), services, ttl_s: 3600 });
		for (const w of worlds.slice(1)) {
			try {
				await gym.seed(tenant, mergeWorlds([w]));
			} catch (e2) {
				warnings.push(
					`seed refused: ${e2 instanceof Error ? e2.message.slice(0, 160) : String(e2)}`,
				);
			}
		}
	}
	const report = isRecord(doc.report) ? doc.report : {};
	for (const w of Array.isArray(report.warnings) ? report.warnings : []) {
		if (isRecord(w)) warnings.push(`${String(w.path)}: ${String(w.message)}`);
	}
	return { tenant: await gym.getTenant(tenant), warnings };
}
