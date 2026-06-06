import type { ChangedFile, ImpactMap, ResolveResult } from '../coverage-map.js';
import { resolveImpact } from '../coverage-map.js';
import type { Selector } from './selector.js';

/**
 * Selection via the runtime V8 coverage map: a changed source file resolves to
 * the specs that executed it (function/line-level when `ChangedFile.lines` is
 * supplied, whole-file otherwise). Thin Strategy wrapper around the pure
 * {@link resolveImpact}; the fail-open-to-broad contract lives there.
 */
export class V8MapSelector implements Selector {
	readonly name = 'v8-map';

	constructor(
		private readonly map: ImpactMap,
		private readonly opts: { allSpecs?: string[]; siblingFallback?: boolean } = {},
	) {}

	resolve(changed: ChangedFile[]): ResolveResult {
		return resolveImpact(changed, this.map, this.opts);
	}
}
