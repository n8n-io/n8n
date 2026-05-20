<script setup lang="ts">
import { i18n } from '@n8n/i18n';

import { N8nIcon, N8nText } from '@n8n/design-system';
import AiStarsIcon from '@/app/components/AiStarsIcon.vue';
defineProps<{
	isReadOnly?: boolean;
}>();

const emit = defineEmits<{
	close: [];
}>();
</script>

<template>
	<div :class="$style.contentOverrideContainer" data-test-id="fromAI-override-field">
		<div :class="[$style.iconStars, $style.noCornersRight]">
			<AiStarsIcon />
		</div>
		<div :class="$style.overrideInput">
			<N8nText
				v-n8n-html="i18n.baseText('parameterOverride.overridePanelText')"
				color="text-dark"
				size="small"
			/>
		</div>
		<div v-if="!isReadOnly" :class="[$style.overrideCloseButton]" @click="emit('close')">
			<N8nIcon v-if="!isReadOnly" icon="x" size="small" />
		</div>
	</div>
</template>

<style lang="scss" module>
.iconStars {
	align-self: center;
	padding-left: 8px;
	width: 22px;
	text-align: center;
	border: 0;
	color: var(--color--foreground--shade-2);
	background-color: unset;
}

.noCornersRight {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.overrideInput {
	height: 30px;
	align-content: center;
	overflow: hidden;
	text-overflow: ellipsis;
}

.overrideCloseButton {
	border: 0;
	color: var(--color--text--tint-1);
	margin-left: auto;
	padding: 0 var(--spacing--2xs);
	align-self: stretch;
	display: flex;
	align-items: center;
	cursor: pointer;

	&:hover {
		color: var(--color--text);
	}
}

.contentOverrideContainer {
	display: flex;
	align-items: center;
	white-space: nowrap;
	width: 100%;
	gap: var(--spacing--4xs);
	border-radius: var(--radius);
	background-color: var(--color--foreground);
}
</style>
