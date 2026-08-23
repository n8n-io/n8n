import { createApp } from 'vue';

import DevPanel from './DevPanel.vue';

const MOUNT_ID = 'n8n-dev-panel-root';

export function mountDevPanel() {
	if (document.getElementById(MOUNT_ID)) return;

	const container = document.createElement('div');
	container.id = MOUNT_ID;
	document.body.appendChild(container);

	const app = createApp(DevPanel);
	app.mount(container);
}
