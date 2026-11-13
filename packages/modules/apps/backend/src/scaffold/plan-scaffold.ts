import {
	WIREFRAME_CSS,
	WIREFRAME_FONT_URL,
	renderDetailModule,
	renderWireframeBody,
	type AppPlan,
	type WireframeRenderOptions,
} from '@n8n/api-types';

import { createAppScaffold } from './app-scaffold';
import type { AppFiles } from '../storage/app-version-stores';

/**
 * The first version of an app with a plan: the scaffold, with the wireframe as
 * `App.vue`. Each planned block keeps its `data-plan-id` and `v-pre`, so the
 * builder can swap one block at a time for a real component. `public/plan.json`
 * lets the preview overlay show the plan and the build progress.
 */
export function createPlanScaffold(
	plan: AppPlan,
	theme: WireframeRenderOptions['theme'] = 'both',
): AppFiles {
	const files = new Map(createAppScaffold());
	const add = (name: string, content: string) => files.set(name, Buffer.from(content));

	add(
		'src/App.vue',
		[
			'<script setup>',
			"import { onMounted } from 'vue';",
			"import './plan/wireframe.css';",
			"import { mountPlanDetails } from './plan/details.js';",
			'',
			'onMounted(mountPlanDetails);',
			'</script>',
			'',
			'<template>',
			renderWireframeBody(plan, { vue: true, theme }),
			'</template>',
			'',
		].join('\n'),
	);
	add('src/plan/wireframe.css', `@import url('${WIREFRAME_FONT_URL}');\n${WIREFRAME_CSS}`);
	add('src/style.css', '* { box-sizing: border-box; }\nbody { margin: 0; }\n');
	add('src/plan/details.js', renderDetailModule(plan));
	add('public/plan.json', JSON.stringify(plan, null, 2) + '\n');
	return files;
}
