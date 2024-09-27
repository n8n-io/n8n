import { useSettingsStore } from '@/stores/settings.store';

interface Options {
	useDefaultPrefix?: boolean;
}

const DEFAULT_TITLE = 'Workflow Automation';

export function useDocumentTitle({ useDefaultPrefix }: Options = { useDefaultPrefix: true }) {
	const settingsStore = useSettingsStore();
	const { releaseChannel } = settingsStore.settings;
	const defaultPrefix =
		!releaseChannel || releaseChannel === 'stable' ? 'n8n' : `[${releaseChannel.toUpperCase()}]`;

	const set = (title: string) => {
		const prefix = useDefaultPrefix ? `${defaultPrefix} - ` : '';
		document.title = prefix + (title || DEFAULT_TITLE);
	};

	const reset = () => {
		set('');
	};

	return { set, reset };
}
