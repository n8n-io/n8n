import { computed, inject } from 'vue';

import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { CloudBrowserTasksKey } from './useCloudBrowserTasks';

export const LOCAL_BROWSER_COACHMARK_KEY = 'instance-ai-local-browser-coachmark';

/**
 * Tells the user that a browser task runs in a virtual browser, and that they can connect their
 * local browser from the + menu instead. Shows once for each user.
 */
export function useLocalBrowserCoachmark() {
	// Only the thread view provides the tasks, so the composer on the empty state never shows this.
	const cloudBrowserTasks = inject(CloudBrowserTasksKey, undefined);
	const settingsStore = useInstanceAiSettingsStore();
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();

	// A session key appears once the first site passes its access check, so the hint waits until
	// after that site's approval, or shows straight away for a site that needs none.
	const hasOpenBrowser = computed(() =>
		Boolean(
			cloudBrowserTasks?.value.some((task) => task.state === 'running' && task.sessionKey !== ''),
		),
	);

	const shouldShowCoachmark = computed(
		() =>
			hasOpenBrowser.value &&
			settingsStore.isBrowserUseAvailable &&
			settingsStore.browserStatusLoaded &&
			settingsStore.browserUseConnectionStatus === 'none' &&
			!isCalloutDismissed(LOCAL_BROWSER_COACHMARK_KEY),
	);

	async function onDismissCoachmark() {
		await dismissCallout(LOCAL_BROWSER_COACHMARK_KEY);
	}

	return { shouldShowCoachmark, onDismissCoachmark };
}
