<script setup lang="ts">
import { I18nT } from 'vue-i18n';
import { useI18n } from '@n8n/i18n';

const props = withDefaults(
	defineProps<{
		pruneTimeDisplay: string;
		withTopBorder?: boolean;
	}>(),
	{
		withTopBorder: false,
	},
);

const emit = defineEmits<{
	upgrade: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="[$style.retention, { [$style.withTopBorder]: props.withTopBorder }]">
		<span data-test-id="prune-time-display">
			{{ props.pruneTimeDisplay }}
		</span>
		<I18nT keypath="workflowHistory.upgrade" tag="span" scope="global">
			<template #link>
				<a href="#" @click.prevent="emit('upgrade')">
					{{ i18n.baseText('workflowHistory.upgrade.link') }}
				</a>
			</template>
		</I18nT>
	</div>
</template>

<style module lang="scss">
.retention {
	display: grid;
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	text-align: center;
}

.withTopBorder {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
