import { defineFrontendExtension } from '@n8n/sdk/frontend';

defineFrontendExtension({
	setup(n8n) {
		console.log('Cloud Extension', { n8n });
	},
});
