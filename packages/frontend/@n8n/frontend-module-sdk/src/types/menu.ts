import type { IMenuItem } from '@n8n/design-system';
import type { Scope } from '@n8n/permissions';

/**
 * Scopes that reveal a module contribution. The user needs any ONE of them —
 * the `oneOf` default of `@n8n/permissions`, and the semantics every settings
 * page had while it checked the scope itself.
 */
export type ModuleRequiredScopes = Scope | Scope[];

/**
 * A label a module declares, either as a translation key or as a resolved
 * string. One of the two is required, which keeps `IMenuItem`'s guarantee that
 * every menu entry carries a label: a page declaring neither would render a
 * blank row. `labelKey` wins when both are given.
 */
type ModuleLabelDeclaration =
	| { labelKey: string; label?: string }
	| { label: string; labelKey?: string };

/**
 * A settings-sidebar entry a module contributes.
 *
 * `labelKey` and `requiredScopes` are declarations, not resolved values: the
 * shell translates the key and reads the scopes each time the sidebar
 * recomputes. Two things follow. A descriptor needs no value import of
 * `@n8n/i18n` or of an RBAC store, so it stays import-light. And the label
 * follows a locale change, which a `label` resolved once at import time cannot.
 *
 * A resolved `label` and a resolved `available` stay valid, so a descriptor can
 * adopt the declarative form one field at a time.
 *
 * `labelKey` is a plain string, not `BaseTextKey`: the SDK is the contract every
 * module depends on, and it must not hand them the monolithic key type of the
 * central `en.json` (design §8). Per-module key types narrow this later.
 */
export type ModuleSettingsPage = Omit<IMenuItem, 'label'> &
	ModuleLabelDeclaration & {
		/**
		 * Scopes that reveal the page. Omit for a page every authenticated user may
		 * open. The shell ANDs the result with `available`, so a page may declare
		 * both a scope gate and a second condition.
		 */
		requiredScopes?: ModuleRequiredScopes;
	};
