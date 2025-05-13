import { defineBackendExtension } from '@n8n/sdk/backend';

export default defineBackendExtension({
	setup(n8n) {
		console.log(n8n);
	},
});
