import { N8nPlugin } from '@n8n/design-system';
import { createApp } from 'vue';

import { normaliseNode } from '../core/document';
import type { UiNode } from '../core/types';
import UiApp from './UiApp.vue';

/** Mounts a definition into an element. Used by the standalone bundle entry. */
export function createUiApp(
	target: Element | string,
	definition: UiNode,
	token?: string,
	title?: string,
) {
	// Definitions predating regions store a node's children as one bare array.
	const app = createApp(UiApp, { definition: normaliseNode(definition), token, title });
	app.use(N8nPlugin, {});
	app.mount(target);
	return app;
}
