import type { InstanceAiElementAttachment } from '@n8n/api-types';

import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import type { App } from '@/features/apps/apps.types';
import type { InspectedElement } from '@/features/apps/components/AppPreviewFrame.vue';

/**
 * Hands an element picked via the inspect toggle off to Instance AI: staged
 * as a removable chip directly in the app's already-open thread (embedded in
 * its artifact panel), or by opening/revealing that thread with the same
 * chip pre-staged (the standalone Apps admin views, which have no composer
 * of their own).
 */
export function useAppElementSelection() {
	const instanceAiStore = useInstanceAiStore();
	const { openAppArtifactThread } = useInstanceAiHandoff();

	async function selectElement(
		app: App,
		element: InspectedElement,
		embedded: boolean,
	): Promise<void> {
		const attachment: InstanceAiElementAttachment = { type: 'element', appId: app.id, ...element };
		if (embedded) {
			instanceAiStore.stageElementSelection(attachment);
			instanceAiStore.requestComposerFocus();
			return;
		}
		await openAppArtifactThread(
			{ type: 'app', appId: app.id, projectId: app.projectId, name: app.name },
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: app.id } },
			{ initialElementAttachment: attachment },
		);
	}

	return { selectElement };
}
