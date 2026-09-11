import { useI18n } from '@n8n/i18n';

import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import type { App } from '@/features/apps/apps.types';
import { formatRoutePath } from '@/features/apps/pageTree.utils';

type PageAssistantAction = 'add-root' | 'add-child' | 'edit' | 'delete';

/**
 * Pages are derived from the app's own source, not a DB row: there is
 * nothing here to create/update/delete directly. Instead, +/edit/delete
 * hand the change off to Instance AI as a pre-filled (unsent) prompt — the
 * same mechanism the app page uses for its own threads.
 */
export function useAppPageAssistant() {
	const i18n = useI18n();
	const { openAppArtifactThread } = useInstanceAiHandoff();

	/** `fullPath` is the page's whole path (every ancestor's route plus its own), not just its own segment — otherwise the AI has no way to tell which "loading" page, at which level, is meant. */
	function buildPrompt(action: PageAssistantAction, fullPath: string): string {
		const path = formatRoutePath(fullPath, i18n.baseText('apps.page.index'));
		switch (action) {
			case 'add-root':
				return i18n.baseText('apps.page.assistant.add.root');
			case 'add-child':
				return i18n.baseText('apps.page.assistant.add.child', { interpolate: { path } });
			case 'edit':
				return i18n.baseText('apps.page.assistant.edit', { interpolate: { path } });
			case 'delete':
				return i18n.baseText('apps.page.assistant.delete', { interpolate: { path } });
		}
	}

	/**
	 * `onEmbeddedDraft`, when given, fills the prompt into the app's already-open
	 * Instance AI thread instead of opening a new one — the caller passes this
	 * only when it is itself rendered inside that thread (`artifactMode`).
	 */
	async function requestPageChange(
		action: PageAssistantAction,
		app: App,
		fullPath: string,
		onEmbeddedDraft?: (prompt: string) => void,
	): Promise<void> {
		const prompt = buildPrompt(action, fullPath);
		if (onEmbeddedDraft) {
			onEmbeddedDraft(prompt);
			return;
		}
		await openAppArtifactThread(
			{ type: 'app', appId: app.id, projectId: app.projectId, name: app.name },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: app.id } },
			{ initialDraft: prompt },
		);
	}

	return { requestPageChange };
}
