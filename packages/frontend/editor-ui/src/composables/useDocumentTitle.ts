import { useSettingsStore } from '@/stores/settings.store';

const DEFAULT_TITLE = 'n8n';
const DEFAULT_TAGLINE = 'Workflow Automation';

export function useDocumentTitle() {
	const settingsStore = useSettingsStore();
	const { releaseChannel } = settingsStore.settings;
	const suffix =
		!releaseChannel || releaseChannel === 'stable'
			? DEFAULT_TITLE
			: `${DEFAULT_TITLE}[${releaseChannel.toUpperCase()}]`;

	const set = (title: string) => {
		const sections = [title || DEFAULT_TAGLINE, suffix];
		document.title = sections.join(' - ');
	};

	const reset = () => {
		set('');
	};

	return { set, reset };
}
