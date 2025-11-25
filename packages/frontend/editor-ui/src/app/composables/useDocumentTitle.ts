import type { WorkflowTitleStatus } from '@/Interface';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { Ref } from 'vue';
import { updateFavicon, type FaviconStatus } from '@/app/utils/favicon';

const DEFAULT_TITLE = 'n8n';
const DEFAULT_TAGLINE = 'Workflow Automation';

export function useDocumentTitle(windowRef?: Ref<Window | undefined>) {
	const settingsStore = useSettingsStore();
	const { releaseChannel } = settingsStore.settings;
	const suffix =
		!releaseChannel || releaseChannel === 'stable'
			? DEFAULT_TITLE
			: `${DEFAULT_TITLE}[${releaseChannel.toUpperCase()}]`;

	const set = (title: string) => {
		const sections = [title || DEFAULT_TAGLINE, suffix];
		(windowRef?.value?.document ?? document).title = sections.join(' - ');
	};

	const reset = () => {
		set('');
	};

	const setDocumentTitle = (workflowName: string, status: WorkflowTitleStatus) => {
		let faviconStatus: FaviconStatus = 'default';

		if (status === 'EXECUTING') {
			faviconStatus = 'executing';
		} else if (status === 'IDLE') {
			faviconStatus = 'default';
		} else if (status === 'ERROR') {
			faviconStatus = 'error';
		} else if (status === 'SUCCESS') {
			faviconStatus = 'success';
		}

		set(workflowName);
		void updateFavicon(faviconStatus);
	};

	return { set, reset, setDocumentTitle };
}
