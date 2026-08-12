// Keep first: it installs globals that dependencies touch while initialising.
import './process-shim';

import '@n8n/design-system/css/index.scss';

import type { UiNode } from '../core/types';
import { createUiApp } from './create-app';

// The bundle entry for the served page. The UI Builder node writes the
// definition into `window.__N8N_UI__` in an inline script just above the tag
// that loads this file.
declare global {
	interface Window {
		__N8N_UI__?: { definition: UiNode; token?: string; title?: string };
	}
}

function boot() {
	const payload = window.__N8N_UI__;
	const target = document.getElementById('app');

	if (!payload?.definition || !target) {
		console.error('[ui-builder] nothing to mount: missing definition or #app');
		return;
	}

	createUiApp(target, payload.definition, payload.token, payload.title);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', boot);
} else {
	boot();
}
