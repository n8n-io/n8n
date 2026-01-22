<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nTooltip } from '@n8n/design-system';

defineProps<{
	visible: boolean;
}>();

const emit = defineEmits<{
	dismiss: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nTooltip :visible="visible" :content-class="$style.content">
		<template #content>
			<div :class="$style.header">
				<span :class="$style.title">{{ i18n.baseText('aiAssistant.coachmark.title') }}</span>
			</div>
			<p :class="$style.body">
				{{ i18n.baseText('aiAssistant.coachmark.body') }}
			</p>
			<div :class="$style.footer">
				<N8nButton
					size="small"
					:label="i18n.baseText('aiAssistant.coachmark.gotIt')"
					:class="$style.gotItButton"
					@click="emit('dismiss')"
				/>
			</div>
		</template>
		<slot />
	</N8nTooltip>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--4xs) var(--spacing--2xs);
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	line-height: 1.45;
}

.body {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	padding: 0 var(--spacing--2xs);
	margin: 0;
}

.footer {
	padding: var(--spacing--2xs);
}

.gotItButton {
	background-color: var(--color--primary);

	&:hover {
		background-color: var(--color--primary--shade-1);
	}
}

.content {
	width: 289px;
}
</style>
