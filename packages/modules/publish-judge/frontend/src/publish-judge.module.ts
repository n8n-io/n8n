import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { PUBLISH_JUDGE_MANAGE_SCOPE, PUBLISH_JUDGE_SETTINGS_VIEW } from './publish-judge.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const PublishJudgeSettingsView = async () => await import('./PublishJudgeSettingsView.vue');

/** Keep this file import-light: the shell runs every descriptor body before Pinia starts. */
export const PublishJudgeModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'publish-judge',
	name: 'Publish Judge',
	description: 'Lets an admin choose a workflow that approves or refuses each publish',
	icon: 'scale',
	routes: [
		{
			path: 'security/judges',
			name: PUBLISH_JUDGE_SETTINGS_VIEW,
			component: PublishJudgeSettingsView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: PUBLISH_JUDGE_MANAGE_SCOPE } },
				telemetry: { pageCategory: 'settings' },
			},
		},
	],
});
