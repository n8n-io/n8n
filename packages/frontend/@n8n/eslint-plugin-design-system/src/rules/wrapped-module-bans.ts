/**
 * Libraries that a design-system entry wraps as a whole.
 * Only the entry folder may import the library. Every import and re-export form is reported elsewhere,
 * because the entry adds behaviour that a direct import skips.
 */
export type WrappedModuleBan = {
	/** The package name. Its subpaths are banned too. */
	library: string;
	/** Folders under `design-system/src` that may import the library. */
	allowedFolders: readonly string[];
	/** The design-system entry that callers import instead. */
	entry: string;
};

export const wrappedModuleBans = [
	{
		// The chart components of the entry register the Chart.js parts that n8n charts use.
		// The components of `vue-chartjs` register only their own controller, and the editor
		// does not register Chart.js at startup.
		library: 'vue-chartjs',
		allowedFolders: ['charts'],
		entry: '@n8n/design-system/charts',
	},
] as const satisfies readonly WrappedModuleBan[];
