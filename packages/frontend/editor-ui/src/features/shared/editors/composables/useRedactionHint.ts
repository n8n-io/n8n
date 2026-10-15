import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';

/**
 * Redaction empties the item data, so an expression that reads it resolves to
 * nothing even though the execution has a value. This exposes the active
 * execution's redaction state and the hint text to show in place of the empty
 * value, picked by whether the user can reveal the data.
 */
export function useRedactionHint() {
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const i18n = useI18n();

	const redactionInfo = computed(
		() => workflowExecutionStateStore.value.activeExecution?.data?.redactionInfo,
	);

	const isRedacted = computed(() => redactionInfo.value?.isRedacted === true);

	const redactedHintText = computed(() => {
		const info = redactionInfo.value;
		if (info?.reason === 'dynamic_credentials') {
			return i18n.baseText('expressionModalInput.redacted.dynamicCredentials');
		}
		// Live push data supplies a provisional canReveal:false before the finished
		// execution metadata arrives. Show the neutral prompt until we know.
		if (!info?.provisional && info?.canReveal !== true) {
			return i18n.baseText('expressionModalInput.redacted.noPermission');
		}
		return i18n.baseText('expressionModalInput.redacted');
	});

	return { isRedacted, redactedHintText };
}
