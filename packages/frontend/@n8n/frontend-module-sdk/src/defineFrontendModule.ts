import type { FrontendModuleDescription } from './types/descriptor';

/**
 * Declares a frontend module descriptor.
 *
 * Identity at runtime: it returns the object it was given. It does not wrap,
 * clone, or freeze it, so a descriptor declared through it behaves exactly as a
 * descriptor declared with a type annotation.
 *
 * What it adds is a seam and inference. The seam gives the SDK one place to
 * attach validation or a dev-mode check later, instead of ten declaration sites
 * it cannot see. The inference keeps each field's literal type — `MyModule.id`
 * reads as `'my-feature'`, not `string` — which an annotation widens away.
 *
 * Use it for every descriptor. An annotated descriptor still satisfies the type,
 * but it is not the canonical form.
 *
 * ```ts
 * export const MyFeatureModule = defineFrontendModule({
 *   id: 'my-feature',
 *   name: 'My Feature',
 *   description: 'What this module does',
 *   icon: 'box',
 * });
 * ```
 */
export function defineFrontendModule<const T extends FrontendModuleDescription>(module: T): T {
	return module;
}
