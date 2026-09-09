import type { Router, RouteRecordRaw } from 'vue-router';

import type { FrontendModuleDescription } from './types/descriptor';

const SHELL_OWNER = 'the app shell';

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
 * Throws when a module claims a route name that is already taken, by the shell
 * or by another module.
 *
 * Route names are global to the router, and `router.addRoute` replaces a
 * duplicate without warning — the losing route simply stops resolving. A central
 * `VIEWS` enum kept every name unique, shell and module alike, because they were
 * all members of one enum. Module-owned name constants are the better contract,
 * but they scatter that check, so it is restored here.
 *
 * Call this before registering any module route. The shell's names are read from
 * `router`, so a module route added earlier would be counted as pre-existing
 * rather than reported.
 */
export function assertUniqueRouteNames(modules: FrontendModuleDescription[], router: Router): void {
	const owners = new Map<string | symbol, string>();

	for (const { name } of router.getRoutes()) {
		if (name !== undefined && name !== null) {
			owners.set(name, SHELL_OWNER);
		}
	}

	for (const module of modules) {
		if (!module.routes) continue;

		for (const name of declaredRouteNames(module.routes)) {
			const owner = owners.get(name);
			if (owner !== undefined) {
				throw new Error(
					`Duplicate route name "${String(name)}" declared by module "${module.id}" — already taken by ${owner}.`,
				);
			}
			owners.set(name, `module "${module.id}"`);
		}
	}
}
