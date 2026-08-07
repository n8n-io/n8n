import type { RouterLinkProps } from 'vue-router';

/**
 * A settings-page nav entry a module contributes. Deliberately self-contained
 * (a stable subset of the design-system `IMenuItem`) so the module contract
 * does not couple to sidebar internals.
 *
 * `icon` is a plain `string` rather than the design-system `IconName` union:
 * the concrete icon set is a shell detail that changes whenever icons are
 * added, and an unknown name degrades at render time rather than breaking the
 * contract. `designSystemCompat.test.ts` asserts this type stays assignable to
 * `IMenuItem`, so drift fails in CI rather than at a consumer's build.
 */
export interface ModuleSettingsPage {
	id: string;
	label: string;
	icon?: string;
	position?: 'top' | 'bottom';
	/** Evaluated by the shell at render time; commonly an RBAC check. */
	available?: boolean;
	disabled?: boolean;
	notification?: boolean;
	preview?: boolean;
	route?: RouterLinkProps;
	/** Extra route names/paths that should mark this entry active. */
	activateOnRouteNames?: string[];
	activateOnRoutePaths?: string[];
}
