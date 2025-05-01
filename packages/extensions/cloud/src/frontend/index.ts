import { defineFrontendExtension } from '@n8n/extension-sdk/frontend';

export default defineFrontendExtension({
	setup(n8n) {
		console.log(n8n);
	},
});
