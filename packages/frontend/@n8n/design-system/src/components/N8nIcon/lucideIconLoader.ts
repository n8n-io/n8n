type IconLoaders = Record<string, () => Promise<{ default: string | null }>>;

const bodyCache = new Map<string, string>();
let loaders: IconLoaders | null = null;
let loadersPromise: Promise<IconLoaders> | null = null;

async function getLoaders(): Promise<IconLoaders> {
	if (loaders) return loaders;
	if (!loadersPromise) {
		loadersPromise = import('virtual:lucide-icon-loader').then((mod) => {
			loaders = mod.default;
			return loaders!;
		});
	}
	return loadersPromise!;
}

export async function loadLucideIconBody(name: string): Promise<string | null> {
	const cached = bodyCache.get(name);
	if (cached !== undefined) return cached;

	const map = await getLoaders();
	const loader = map[name];
	if (!loader) return null;

	const mod = await loader();
	const body = mod.default;
	if (body) bodyCache.set(name, body);
	return body;
}

const BULK_THRESHOLD = 200;

export async function loadLucideIconBodies(names: string[]): Promise<Record<string, string>> {
	const unique = [...new Set(names)];
	const result: Record<string, string> = {};

	const uncached: string[] = [];
	for (const name of unique) {
		const cached = bodyCache.get(name);
		if (cached !== undefined) {
			result[name] = cached;
		} else {
			uncached.push(name);
		}
	}

	if (uncached.length === 0) return result;

	if (uncached.length > BULK_THRESHOLD) {
		const { default: allBodies } = await import('virtual:lucide-icons');
		for (const [name, body] of Object.entries(allBodies)) {
			bodyCache.set(name, body);
		}
		for (const name of uncached) {
			if (allBodies[name]) {
				result[name] = allBodies[name];
			}
		}
		return result;
	}

	const map = await getLoaders();
	await Promise.all(
		uncached.map(async (name) => {
			const loader = map[name];
			if (!loader) return;
			const mod = await loader();
			if (mod.default) {
				bodyCache.set(name, mod.default);
				result[name] = mod.default;
			}
		}),
	);

	return result;
}
