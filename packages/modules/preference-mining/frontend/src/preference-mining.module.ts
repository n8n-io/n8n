import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';

export const PreferenceMiningModule = defineFrontendModule({
	id: 'preference-mining',
	name: 'Preference Mining',
	description: 'Compare preference mining approaches within a project',
	icon: 'flask-conical',
	routes: [
		{
			path: 'preference-mining',
			name: 'preference-mining',
			// Vue checks this lazy component during typecheck.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			component: async () => await import('./PreferenceMiningView.vue'),
			meta: { projectRoute: true, middleware: ['authenticated', 'custom'] },
		},
	],
	projectTabs: {
		project: [
			{
				value: 'preference-mining',
				get label() {
					return useI18n().baseText('preferenceMining.title');
				},
				icon: 'flask-conical',
				dynamicRoute: { name: 'preference-mining', includeProjectId: true },
			},
		],
	},
});
