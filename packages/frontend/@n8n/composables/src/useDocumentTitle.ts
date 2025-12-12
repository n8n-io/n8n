import type { Ref } from 'vue';

const DEFAULT_TITLE = 'n8n';
const DEFAULT_TAGLINE = 'Workflow Automation';

export type WorkflowTitleStatus = 'EXECUTING' | 'IDLE' | 'ERROR' | 'DEBUG';

export interface UseDocumentTitleOptions {
	/**
	 * The release channel (e.g., 'stable', 'beta', 'dev').
	 * If not provided or 'stable', the title will be 'n8n'.
	 * Otherwise, it will be 'n8n[CHANNEL]'.
	 */
	releaseChannel?: string;
	/**
	 * Optional window reference for setting the document title.
	 * Useful for pop-out windows.
	 */
	windowRef?: Ref<Window | undefined>;
}

export function useDocumentTitle(options: UseDocumentTitleOptions = {}) {
	const { releaseChannel, windowRef } = options;
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
		let icon = '⚠️';
		if (status === 'EXECUTING') {
			icon = '🔄';
		} else if (status === 'IDLE') {
			icon = '▶️';
		}
		set(`${icon} ${workflowName}`);
	};

	return { set, reset, setDocumentTitle };
}
