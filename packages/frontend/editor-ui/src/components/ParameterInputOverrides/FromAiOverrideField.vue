<script setup lang="ts">
import { i18n } from '@n8n/i18n';

import { N8nIconButton, N8nText } from '@n8n/design-system';
import AiStarsIcon from '@/components/AiStarsIcon.vue';
defineProps<{
	isReadOnly?: boolean;
}>();

const emit = defineEmits<{
	close: [];
}>();
</script>

<template>
	<div :class="$style.contentOverrideContainer" data-test-id="fromAI-override-field">
		<div :class="[$style.iconStars, 'el-input-group__prepend', $style.noCornersRight]">
			<AiStarsIcon />
		</div>
		<div :class="$style.overrideInput">
			<N8nText
				v-n8n-html="i18n.baseText('parameterOverride.overridePanelText')"
				color="text-dark"
				size="small"
			/>
		</div>
		<N8nIconButton
			v-if="!isReadOnly"
			type="tertiary"
			:class="['n8n-input', $style.overrideCloseButton]"
			:outline="false"
			icon="x"
			size="small"
			@click="emit('close')"
		/>
	</div>
</template>

<style lang="scss" module>
.iconStars {
	align-self: center;
	padding-left: 8px;
	width: 22px;
	text-align: center;
	border: none;
	color: var(--color--foreground--shade-2);
	background-color: var(--color--foreground);
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
	padding: 0 var(--spacing--2xs);
	border: 0;
	color: var(--color--text);
	margin-left: auto;
	--button-hover-background-color: transparent;
	--button-active-background-color: transparent;
	background-color: var(--color--foreground);
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
