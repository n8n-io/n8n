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
 */
export type ModuleComponentSlot = 'project-filter';

/**
 * The `v-model` value of the `project-filter` slot. `null` means "all projects".
 *
 * Deliberately narrow: `id` is all a consumer needs, and the host keeps the full
 * project object. A consumer writes only `null` (to clear); every non-null value
 * originates in the host.
 */
export type SlotProjectSelection = { id: string } | null;
