import { defineConfig } from 'oxlint';
import { vueConfig } from '@n8n/oxlint-config/vue';
import editorUiConfig from './oxlint-rules.json' with { type: 'json' };

/**
 * `oxlint-rules.json` stays a JSON file because `eslint.config.mjs` reads it to
 * turn off the rules that oxlint already runs. The Vue rules come from the
 * shared layer and need no ESLint twin.
 */
export default defineConfig({
	...editorUiConfig,
	extends: [vueConfig],
	// oxlint does not inherit `settings` through `extends`.
	settings: { ...editorUiConfig.settings, ...vueConfig.settings },
	rules: {
		...editorUiConfig.rules,
		// TODO: Remove this
		'vize/vue/attribute-hyphenation': 'warn',
	},
	overrides: [
		...editorUiConfig.overrides,
		{
			// These components render several roots on purpose. A disable comment in the
			// template would add a comment node to dev builds and to snapshots.
			files: [
				'src/features/roles/components/RoleHoverPopover.vue',
				'src/features/shared/nodeCreator/views/NodeCreation.vue',
				'src/features/workflows/canvas/components/elements/edges/CanvasConnectionLine.vue',
				'src/features/workflows/canvas/components/elements/edges/CanvasEdge.vue',
				'src/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue',
			],
			rules: { 'vize/vue/no-multiple-template-root': 'off' },
		},
	],
});
