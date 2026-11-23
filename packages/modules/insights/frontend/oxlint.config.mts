import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	rules: {
		// The chart components of `@n8n/design-system/charts` register the Chart.js parts that the
		// charts use. The components of `vue-chartjs` register only their own controller.
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['vue-chartjs', 'vue-chartjs/*'],
						message:
							'Import chart components from @n8n/design-system/charts. They register the Chart.js parts that the chart needs.',
					},
				],
			},
		],
	},
});
