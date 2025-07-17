<script setup lang="ts">
import NodeIcon from '@/components/NodeIcon.vue';
import { N8nInlineTextEdit } from '@n8n/design-system';
import { useElementSize } from '@vueuse/core';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useTemplateRef } from 'vue';

type Props = {
	modelValue: string;
	nodeType?: INodeTypeDescription | null;
	readOnly?: boolean;
	size?: 'small' | 'medium';
	subTitle?: string;
	layout?: 'stacked' | 'inline';
	fitWidth?: boolean;
};

withDefaults(defineProps<Props>(), {
	nodeType: undefined,
	readOnly: false,
	size: 'medium',
	subTitle: undefined,
	layout: 'inline',
	fitWidth: undefined,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

function onRename(value: string) {
	if (value.trim() !== '') {
		emit('update:model-value', value.trim());
	}
}

const wrapperRef = useTemplateRef('wrapperRef');
const { width } = useElementSize(wrapperRef);
</script>

<template>
	<span
		:class="[
			$style.container,
			size === 'small' ? $style.small : '',
			layout === 'stacked' ? $style.stacked : $style.inline,
		]"
		data-test-id="node-title-container"
	>
		<span :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="18" :show-tooltip="true" tooltip-position="left" />
		</span>
		<div ref="wrapperRef" :class="$style.textWrapper">
			<div :class="$style.mainTextWrapper">
				<N8nInlineTextEdit
					:max-width="fitWidth ? width : undefined"
					:min-width="fitWidth ? undefined : 0"
					:model-value="modelValue"
					:read-only="readOnly"
					@update:model-value="onRename"
				/>
			</div>
			<N8nText v-if="subTitle" bold size="small" color="text-light" :class="$style.subText">
				{{ subTitle }}
			</N8nText>
		</div>
	</span>
</template>

<style lang="scss" module>
.container {
	font-weight: var(--font-weight-medium);
	display: flex;
	align-items: center;
	font-size: var(--font-size-m);
	color: var(--color-text-dark);
	width: 100%;

	&.small {
		font-size: var(--font-size-s);
	}
}

.textWrapper {
	flex-grow: 1;
	flex-shrink: 1;
	display: flex;
	flex-direction: row;
	gap: var(--spacing-4xs);

	.stacked & {
		flex-direction: column;
	}
}

.mainTextWrapper {
	flex-shrink: 1;
}

.subText {
	flex-grow: 1;
	flex-shrink: 1;
	white-space: nowrap;

	.inline & {
		margin-top: 1px;
	}
}

.iconWrapper {
	display: inline-flex;
	margin-right: var(--spacing-2xs);
}
</style>
