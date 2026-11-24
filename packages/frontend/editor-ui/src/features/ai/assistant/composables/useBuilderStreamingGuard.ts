import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useMessage } from '@/app/composables/useMessage';
import { useI18n } from '@n8n/i18n';
import { MODAL_CONFIRM } from '@/app/constants';

/**
 * Shows a confirmation dialog if the AI builder is currently streaming.
 * Returns `true` if the caller should proceed (not streaming, or user confirmed).
 * Returns `false` if the user cancelled and the caller should abort.
 *
 * When the user confirms, streaming is aborted before returning.
 */
export async function confirmIfBuilderStreaming(): Promise<boolean> {
	const builderStore = useBuilderStore();

	if (!builderStore.streaming) {
		return true;
	}

	const { confirm } = useMessage();
	const i18n = useI18n();

	const response = await confirm(
		i18n.baseText('aiAssistant.builder.upgradeWhileStreaming.message'),
		{
			title: i18n.baseText('aiAssistant.builder.upgradeWhileStreaming.title'),
			type: 'warning',
			confirmButtonText: i18n.baseText(
				'aiAssistant.builder.upgradeWhileStreaming.confirmButtonText',
			),
			cancelButtonText: i18n.baseText('aiAssistant.builder.upgradeWhileStreaming.cancelButtonText'),
			showClose: true,
		},
	);

	if (response !== MODAL_CONFIRM) {
		return false;
	}

	builderStore.abortStreaming();
	return true;
}
