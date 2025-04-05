import { defineFrontendExtension } from '@n8n/extension-sdk/frontend';
import InsightsDashboard from './InsightsDashboard.vue';

export default defineFrontendExtension({
	setup(n8n) {
		console.log(n8n);
		n8n.registerComponent('InsightsDashboard', InsightsDashboard);
	},
});
