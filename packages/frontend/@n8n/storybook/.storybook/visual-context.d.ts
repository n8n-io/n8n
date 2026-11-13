/** Values that `vitest.visual.config.ts` gives to each visual project through `test.provide`. */
declare module 'vitest' {
	interface ProvidedContext {
		/** The theme of the project. It is part of each screenshot name. */
		visualTheme: 'light' | 'dark';
		/** Read by `@storybook/addon-vitest`. `a11y: false` turns off the a11y addon's checks. */
		'storybook/test-provided': { a11y: boolean };
	}
}

export {};
