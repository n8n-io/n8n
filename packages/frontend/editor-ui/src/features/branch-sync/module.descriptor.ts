import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { BRANCH_SYNC_VIEW } from './constants';

const BranchSyncView = async () => await import('./views/BranchSyncView.vue');

/**
 * LIGO-819 POC: tracked-branch reconciliation UI. Route availability is gated
 * by the module initializer (`meta.moduleName` is derived from `id`, and the
 * `custom` middleware checks `settingsStore.isModuleActive('branch-sync')`).
 */
export const BranchSyncModule: FrontendModuleDescription = {
	id: 'branch-sync',
	name: 'Branch Sync',
	description: 'Keep an instance or project in sync with a tracked git branch.',
	icon: 'git-branch',
	routes: [
		{
			path: '/branch-sync',
			name: BRANCH_SYNC_VIEW,
			component: BranchSyncView,
			meta: {
				layout: 'default',
				middleware: ['authenticated', 'custom'],
			},
		},
	],
};
