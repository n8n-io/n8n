<script lang="ts" setup>
import { ElSwitch } from 'element-plus';
import { N8nBadge, N8nSettingsRow, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	showPublishing: boolean;
	showPromoting: boolean;
	publishing: boolean;
	promoting: boolean;
	publishingLocked: boolean;
	promotingLocked: boolean;
	disabled?: boolean;
	publishingTestId: string;
	promotingTestId: string;
}>();

const emit = defineEmits<{
	'update:publishing': [value: boolean];
	'update:promoting': [value: boolean];
}>();

const i18n = useI18n();

function nextValue(value: string | number | boolean, current: boolean): boolean {
	return typeof value === 'boolean' ? value : !current;
}
</script>

<template>
	<N8nSettingsRow
		v-if="showPublishing"
		:title="i18n.baseText('workflowReviews.enforcement.publishing.title')"
		:description="i18n.baseText('workflowReviews.enforcement.publishing.description')"
	>
		<template #action>
			<div :class="$style.action">
				<N8nTooltip v-if="publishingLocked" placement="top">
					<template #content>
						{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
					</template>
					<N8nBadge leading-icon="lock" data-test-id="workflow-review-publishing-required-badge">
						{{ i18n.baseText('workflowReviews.enforcement.required') }}
					</N8nBadge>
				</N8nTooltip>
				<ElSwitch
					:model-value="publishingLocked || publishing"
					size="large"
					:disabled="disabled || publishingLocked"
					:data-test-id="publishingTestId"
					@update:model-value="emit('update:publishing', nextValue($event, props.publishing))"
				/>
			</div>
		</template>
	</N8nSettingsRow>
	<N8nSettingsRow
		v-if="showPromoting"
		:title="i18n.baseText('workflowReviews.enforcement.promoting.title')"
		:description="i18n.baseText('workflowReviews.enforcement.promoting.description')"
	>
		<template #action>
			<div :class="$style.action">
				<N8nTooltip v-if="promotingLocked" placement="top">
					<template #content>
						{{ i18n.baseText('workflowReviews.enforcement.lockedByInstance') }}
					</template>
					<N8nBadge leading-icon="lock" data-test-id="workflow-review-promoting-required-badge">
						{{ i18n.baseText('workflowReviews.enforcement.required') }}
					</N8nBadge>
				</N8nTooltip>
				<ElSwitch
					:model-value="promotingLocked || promoting"
					size="large"
					:disabled="disabled || promotingLocked"
					:data-test-id="promotingTestId"
					@update:model-value="emit('update:promoting', nextValue($event, props.promoting))"
				/>
			</div>
		</template>
	</N8nSettingsRow>
</template>

<style module>
.action {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
