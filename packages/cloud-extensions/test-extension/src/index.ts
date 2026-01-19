import { markRaw } from 'vue';

// Import module augmentation for i18n type safety
import './locales.generated';

import { usePostHog } from '@/app/stores/posthog.store';
import { defineCloudExtension } from '@n8n/extension-sdk/cloud';
import HelloWorld from './components/HelloWorld.vue';
import DemoModal from './components/DemoModal.vue';
import DemoPage from './components/DemoPage.vue';

export default defineCloudExtension({
	name: '@n8n/ce-test-extension',
	version: '0.0.1',
	displayName: 'Test Extension',
	description: 'Demonstrates all extension capabilities',

	extends: {
		'views.projects.header.button': {
			component: markRaw(HelloWorld),
			priority: 100,
		},
	},

	routes: [
		{
			path: '/extension-demo',
			name: 'extension-demo',
			component: DemoPage,
		},
	],

	modals: [
		{
			key: 'demo',
			component: markRaw(DemoModal),
		},
	],

	locales: {
		en: {
			title: 'Extension Demo',
			description: 'This component demonstrates the extension system.',
			openModal: 'Open Modal',
			viewPage: 'View Demo Page',
			modal: {
				title: 'Demo Modal',
				content: 'This modal was opened from the extension.',
				close: 'Close',
			},
			page: {
				title: 'Demo Page',
				content: 'This page was added by the extension.',
				backLink: 'Back to Projects',
			},
		},
	},

	shouldLoad: async () => {
		try {
			const posthog = usePostHog();

			// Check if the feature flag is enabled
			const enabled = posthog.isFeatureEnabled('hello-world-plugin');

			console.log('[test-extension] Feature flag check:', {
				flag: 'hello-world-plugin',
				enabled,
			});

			return enabled;
		} catch (error) {
			console.error('[test-extension] Error checking feature flag:', error);
			// Fail open: load extension if we can't check the flag
			return true;
		}
	},
});
