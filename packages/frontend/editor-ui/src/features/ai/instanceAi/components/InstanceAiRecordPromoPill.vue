<script lang="ts" setup>
import { N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{ click: []; dismiss: [] }>();

defineProps<{
	eligible: boolean;
}>();

const i18n = useI18n();
</script>

<template>
	<div v-if="eligible" :class="$style.pill" data-test-id="instance-ai-record-promo">
		<button type="button" :class="$style.body" @click="emit('click')">
			<N8nIcon icon="video" :class="$style.icon" />
			<N8nText size="small" :class="$style.copy">{{
				i18n.baseText('instanceAi.recordPromo.label')
			}}</N8nText>
		</button>
		<N8nIconButton
			icon="x"
			variant="ghost"
			size="xsmall"
			:aria-label="i18n.baseText('generic.dismiss')"
			:class="$style.dismiss"
			style="--button--radius: var(--radius--full)"
			data-test-id="instance-ai-record-promo-dismiss"
			@click="emit('dismiss')"
		/>
	</div>
</template>

<style lang="scss" module>
.pill {
	display: inline-flex;
	align-self: center;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs);
	padding-left: var(--spacing--2xs);
	background: var(--background--info);
	border: 1px solid var(--border-color--info);
	border-radius: var(--radius--full);
	white-space: nowrap;
}

.body {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	font: inherit;
}

.icon {
	color: var(--icon-color--info);
}

.copy {
	color: var(--text-color--info);
}

.dismiss {
	--button--color: var(--icon-color--info);
	--button--color--background-hover: color-mix(
		in srgb,
		var(--background--info),
		var(--text-color--info) 10%
	);
	--button--color--background-active: color-mix(
		in srgb,
		var(--background--info),
		var(--text-color--info) 15%
	);
}
</style>
