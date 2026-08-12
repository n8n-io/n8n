import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/frontend';

const srcPath = resolve(__dirname, 'src');

/**
 * `@n8n/design-system` stands in as an inert component for the duration of a
 * test run.
 *
 * `core` is plain logic, but `document.ts` and `pages.ts` read the kit's
 * component definitions, and the kit is Vue single-file components that render
 * design-system ones. Nothing here renders anything: the tests want a
 * descriptor's regions and prop defaults, not a button. Pulling the real
 * design-system in would compile its whole stylesheet tree for that, so the
 * import is answered with a component that draws nothing.
 *
 * Add a name here when the kit starts using another design-system component;
 * an unlisted one fails the run rather than passing quietly.
 */
const STUBBED_DESIGN_SYSTEM_EXPORTS = [
	'N8nButton',
	'N8nDatatable',
	'N8nHeading',
	'N8nInput',
	'N8nText',
];

function designSystemStub(): Plugin {
	const id = '\0ui-builder:design-system-stub';

	return {
		name: 'ui-builder-design-system-stub',
		enforce: 'pre',
		resolveId: (source) => (source === '@n8n/design-system' ? id : undefined),
		load: (loaded) =>
			loaded === id
				? [
						"const stub = { name: 'DesignSystemStub', render: () => null };",
						...STUBBED_DESIGN_SYSTEM_EXPORTS.map((name) => `export const ${name} = stub;`),
						'export default stub;',
					].join('\n')
				: undefined,
	};
}

// A config of its own rather than a `test` block on vite.config.mts: that file
// is two library builds driven by an env var, and none of it applies to a run
// of the tests.
export default mergeConfig(
	defineConfig({
		plugins: [vue(), designSystemStub()],
		resolve: { alias: [{ find: '@', replacement: srcPath }] },
	}),
	createVitestConfig({
		include: ['src/**/*.test.ts'],
		// The shared frontend config expects a per-package setup file. There is
		// nothing to set up: these tests render nothing.
		setupFiles: [],
	}),
);
