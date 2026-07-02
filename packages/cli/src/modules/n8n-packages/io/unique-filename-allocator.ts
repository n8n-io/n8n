import { generateSlug } from './slug.utils';

export class UniqueFilenameAllocator {
	private readonly used = new Set<string>();

	constructor(
		private readonly baseDir: string,
		private readonly fallback: string,
	) {}

	/**
	 * Marks an already-slugified `segment` under `baseDir` as taken, so a later
	 * `allocate()` that slugifies to it gets suffixed instead of colliding. Used to
	 * reserve a fixed sibling dir (e.g. a folder's `workflows/` container) before
	 * allocating names that could clash with it.
	 */
	reserve(segment: string): void {
		this.used.add(`${this.baseDir}/${segment}`);
	}

	allocate(name: string): string {
		const base = `${this.baseDir}/${generateSlug(name, this.fallback)}`;

		if (!this.used.has(base)) {
			this.used.add(base);
			return base;
		}

		for (let suffix = 2; ; suffix++) {
			const candidate = `${base}-${suffix}`;
			if (!this.used.has(candidate)) {
				this.used.add(candidate);
				return candidate;
			}
		}
	}
}
