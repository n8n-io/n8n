/**
 * A command-bar entry a module contributes. Deliberately self-contained (a
 * stable subset of the design-system `CommandBarItem`) so the module contract
 * does not couple to command-bar internals.
 */
export interface CommandBarEntry {
	id: string;
	title: string;
	section?: string;
	keywords?: string[];
	icon?: string;
	handler?: () => void | Promise<void>;
	children?: CommandBarEntry[];
	/**
	 * Route names this command is active on. Undefined/empty means all views.
	 */
	activeViews?: string[];
}
