import { ref } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@/app/stores/settings.store';

export function useServerTime() {
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();

	const serverTime = ref('');

	const getEffectiveTimezone = (): string => {
		const workflowTimezone = workflowsStore.workflowSettings?.timezone;
		if (workflowTimezone && workflowTimezone !== 'DEFAULT') {
			return workflowTimezone;
		}
		return settingsStore.settings.systemTimezone;
	};

	const refreshServerTime = () => {
		serverTime.value = new Date().toLocaleString('en-US', {
			timeZone: getEffectiveTimezone(),
			hour12: false,
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short',
		});
	};

	return { serverTime, refreshServerTime };
}
