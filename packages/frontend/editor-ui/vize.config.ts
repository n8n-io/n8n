import { defineConfig } from 'vize/config';
import { vizeConfig } from '@n8n/oxlint-config/vize';

export default defineConfig({
	...vizeConfig,
	linter: {
		...vizeConfig.linter,
		rules: {
			...vizeConfig.linter?.rules,
			// TODO: Remove this
			'vue/attribute-hyphenation': 'warn',
		},
	},
	entries: [
		{
			// These components render several roots on purpose.
			files: [
				'src/features/roles/components/RoleHoverPopover.vue',
				'src/features/shared/nodeCreator/views/NodeCreation.vue',
				'src/features/workflows/canvas/components/elements/edges/CanvasConnectionLine.vue',
				'src/features/workflows/canvas/components/elements/edges/CanvasEdge.vue',
				'src/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue',
			],
			linter: { rules: { 'vue/no-multiple-template-root': 'off' } },
		},
	],
});
