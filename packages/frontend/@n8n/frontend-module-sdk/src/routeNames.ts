import type { RouteRecordRaw } from 'vue-router';

import type { FrontendModuleDescription } from './types/descriptor';

function* declaredRouteNames(routes: RouteRecordRaw[]): Generator<string | symbol> {
	for (const route of routes) {
		if (route.name !== undefined && route.name !== null) {
			yield route.name;
		}
		if (route.children) {
			yield* declaredRouteNames(route.children);
		}
	}
}

/**
 * Throws when two modules claim the same route name.
 *
 * Route names are global to the router, and `router.addRoute` replaces a
 * duplicate without warning — the losing module's route simply stops resolving.
 * A central `VIEWS` enum kept collisions visible in one file. Module-owned name
 * constants are the better contract, but they scatter that check, so it is
 * restored at the one point where every module's names come back together.
 */
export function assertUniqueRouteNames(modules: FrontendModuleDescription[]): void {
	const owners = new Map<string | symbol, string>();

	for (const module of modules) {
		if (!module.routes) continue;

		for (const name of declaredRouteNames(module.routes)) {
			const owner = owners.get(name);
			if (owner !== undefined) {
				throw new Error(
					`Duplicate route name "${String(name)}" from module "${module.id}" (already declared by "${owner}").`,
				);
			}
			owners.set(name, module.id);
		}
	}
}
