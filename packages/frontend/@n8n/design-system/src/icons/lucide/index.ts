/// <reference path="./shims.d.ts" />
import loaders from 'virtual:lucide-icons';

import type { IconBodyLoader } from '../../composables/useIconBodyLoader';

const cache = new Map<string, string>();

export const loadLucideIconBody: IconBodyLoader = async (name) => {
	const cached = cache.get(name);
	if (cached !== undefined) return cached;

	const loader = loaders[name];
	if (!loader) return null;

	const { default: body } = await loader();
	if (body !== null) cache.set(name, body);
	return body;
};
