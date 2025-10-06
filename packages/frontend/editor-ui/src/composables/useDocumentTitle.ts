import { useSettingsStore } from '@/stores/settings.store';
import type { Ref } from 'vue';

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

	return { set, reset };
}
