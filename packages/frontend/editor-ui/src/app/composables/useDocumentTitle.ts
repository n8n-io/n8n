import type { WorkflowTitleStatus } from '@/Interface';
import { useSettingsStore } from '@/app/stores/settings.store';
import { ref, type Ref } from 'vue';

const DEFAULT_TITLE = 'n8n';
const DEFAULT_TAGLINE = 'Workflow Automation';

export function useDocumentTitle(windowRef?: Ref<Window | undefined>) {
	const settingsStore = useSettingsStore();
	const { releaseChannel } = settingsStore.settings;
	const suffix =
		!releaseChannel || releaseChannel === 'stable'
			? DEFAULT_TITLE
			: `${DEFAULT_TITLE}[${releaseChannel.toUpperCase()}]`;

	const currentState = ref<WorkflowTitleStatus | undefined>(undefined);

	const set = (title: string) => {
		const sections = [title || DEFAULT_TAGLINE, suffix];
		(windowRef?.value?.document ?? document).title = sections.join(' - ');
	};

	const reset = () => {
		currentState.value = undefined;
		set('');
	};

	const setDocumentTitle = (workflowName: string, status: WorkflowTitleStatus) => {
		currentState.value = status;
		let prefix = '⚠️';
		if (status === 'EXECUTING') {
			prefix = '🔄';
		} else if (status === 'IDLE') {
			prefix = '▶️';
		} else if (status === 'AI_BUILDING') {
			prefix = '[Building]';
		} else if (status === 'AI_DONE') {
			prefix = '[Done]';
		}
		set(`${prefix} ${workflowName}`);
	};

	const getDocumentState = () => currentState.value;

	return { set, reset, setDocumentTitle, getDocumentState };
}
