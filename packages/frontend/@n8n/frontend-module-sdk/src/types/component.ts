/**
 * UI a module renders but does not own.
 *
 * Each id names one shell-hosted component with a fixed contract. The union is
 * closed on purpose: this is not a generic slot system, and adding an id is a
 * reviewed change to the module contract, not a local decision.
 *
 * `project-filter` — a project picker. The project list, the permissions that
 * decide between local and remote search, and the search itself all live in
 * `features/collaboration/projects`, which sits above the module layer. A module
 * that needs to filter by project renders this instead of importing any of it.
 *
 * `credential-picker` — the credential picker of the node panel, with "Create new credential".
 * Props: `appName`, `credentialType`, `selectedCredentialId` (`string | null`). Emits
 * `credentialSelected` (the id) and `credentialDeselected`. Load the credentials first with the
 * `credentialCatalog` capability.
 *
 * `community-nodes` — the Community nodes settings page: the installed packages and "Install".
 * Prop `embedded`: the host page owns the heading and the document title. The page does not
 * check access, so the module shows it only to a user who may open
 * the Community nodes settings route.
 */
export type ModuleComponentSlot = 'project-filter' | 'credential-picker' | 'community-nodes';

/**
 * The `v-model` value of the `project-filter` slot. `null` means "all projects".
 *
 * Deliberately narrow: `id` is all a consumer needs, and the host keeps the full
 * project object. A consumer writes only `null` (to clear); every non-null value
 * originates in the host.
 */
export type SlotProjectSelection = { id: string } | null;
