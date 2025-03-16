const DEFAULT_TITLE = 'Workflow Automation';

export function useDocumentTitle() {
	// const settingsStore = useSettingsStore();
	// const { releaseChannel } = settingsStore.settings;

	const set = (title: string) => {
		const sections = [title || DEFAULT_TITLE, 'CiaraAI'];
		document.title = sections.join(' | ');
	};

	const reset = () => {
		set('');
	};

	return { set, reset };
}
