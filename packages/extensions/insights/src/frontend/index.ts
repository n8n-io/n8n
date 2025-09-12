import { defineFrontendExtension } from '@n8n/extension-sdk/frontend';
import { markRaw } from 'vue';

import InsightsDashboard from './InsightsDashboard.vue';

export default defineFrontendExtension({
	setup(n8n) {
		n8n.registerComponent('InsightsDashboard', markRaw(InsightsDashboard));
	},
});
