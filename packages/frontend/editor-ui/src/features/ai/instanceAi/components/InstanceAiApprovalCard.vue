<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ConfirmationFooter from './ConfirmationFooter.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';

type ApprovalSeverity = 'info' | 'warning' | 'destructive';

const props = withDefaults(
	defineProps<{
		title: string;
		message: string;
		severity?: ApprovalSeverity;
		disabled?: boolean;
		withPanel?: boolean;
	}>(),
	{
		severity: 'info',
		disabled: false,
		withPanel: true,
	},
);

const emit = defineEmits<{
	approve: [];
	deny: [];
}>();

const i18n = useI18n();

const approveVariant = computed(() => (props.severity === 'destructive' ? 'destructive' : 'solid'));
</script>

<template>
	<div :class="[withPanel && $style.root]" data-test-id="instance-ai-confirmation-panel">
		<div :class="$style.approvalRow">
			<div :class="$style.approvalRowBody">
				<N8nText size="medium" bold>
					{{ title }}
				</N8nText>
				<ConfirmationPreview>{{ message }}</ConfirmationPreview>
			</div>

			<ConfirmationFooter>
				<N8nButton
					data-test-id="instance-ai-panel-confirm-deny"
					size="medium"
					variant="outline"
					:disabled="disabled"
					@click="emit('deny')"
				>
					{{ i18n.baseText('instanceAi.confirmation.deny') }}
				</N8nButton>
				<N8nButton
					data-test-id="instance-ai-panel-confirm-approve"
					size="medium"
					:variant="approveVariant"
					:disabled="disabled"
					@click="emit('approve')"
				>
					{{ i18n.baseText('instanceAi.confirmation.approve') }}
				</N8nButton>
			</ConfirmationFooter>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.approvalRow {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
}

.approvalRowBody {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
