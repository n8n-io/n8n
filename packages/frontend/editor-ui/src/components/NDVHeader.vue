<script setup lang="ts">
import type { NodeIconSource } from '@/utils/nodeIcon';
import { N8nIconButton, N8nInput } from '@n8n/design-system';
import { nextTick, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { onClickOutside } from '@vueuse/core';

const props = defineProps<{
	nodeName: string;
	nodeTypeName: string;
	icon?: NodeIconSource;
	readOnly?: boolean;
}>();

const isRenaming = ref(false);
const text = ref('');
const inputRef = ref<HTMLInputElement>();
const i18n = useI18n();

const emit = defineEmits<{ close: []; rename: [name: string] }>();

async function onEdit() {
	isRenaming.value = true;
	text.value = props.nodeName;

	await nextTick(() => {
		inputRef.value?.focus();
		inputRef.value?.select();
	});
}

function onSave() {
	emit('rename', text.value || props.nodeTypeName);

	isRenaming.value = false;
}

onClickOutside(inputRef, onSave);
</script>

<template>
	<header :class="[$style.ndvHeader, { [$style.editable]: !readOnly }]">
		<div :class="$style.content">
			<NodeIcon v-if="icon" :class="$style.icon" :size="20" :icon-source="icon" />
			<div v-if="!isRenaming" :class="$style.title" @click="onEdit">{{ nodeName }}</div>
			<N8nInput
				v-else
				ref="inputRef"
				v-model.lazy="text"
				:class="$style.titleInput"
				size="small"
				autosize
				@keydown.enter="onSave"
			/>
			<p v-if="nodeName !== nodeTypeName && !isRenaming" :class="$style.subtitle">
				{{ nodeTypeName }}
			</p>
		</div>

		<N8nTooltip :content="i18n.baseText('ndv.close.tooltip')">
			<N8nIconButton icon="times" type="tertiary" @click="emit('close')" />
		</N8nTooltip>
	</header>
</template>

<style lang="css" module>
.ndvHeader {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs);
	background: var(--color-background-xlight);
}

.content {
	display: flex;
	align-items: baseline;
	gap: var(--spacing-2xs);
	margin-left: var(--spacing-2xs);
}

.title {
	color: var(--color-text-dark);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}

.titleInput input {
	--icon-width: 20px;
	font-size: var(--font-size-m);
	margin-left: calc(-1 * var(--icon-width) - var(--spacing-s));
	padding-left: calc(var(--icon-width) + var(--spacing-s));
	z-index: -1;
}

.editable .title {
	cursor: pointer;

	&:hover {
		background-color: var(--color-background-base);
		border-radius: var(--border-radius-base);
		outline: solid 2px var(--color-background-base);
	}
}

.subtitle {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);
	font-weight: var(--font-weight-bold);
	margin: 0;
}

.icon {
	align-self: center;
	z-index: 1;
}
</style>
