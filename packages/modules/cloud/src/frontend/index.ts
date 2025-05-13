import { defineFrontendModule } from '@n8n/sdk/frontend';

defineFrontendModule({
	setup(n8n) {
		console.log('Cloud Module', { n8n });
	},
});
