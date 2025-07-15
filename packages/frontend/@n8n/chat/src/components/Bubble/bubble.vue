<script setup lang="ts">
import { computed, useSlots, useTemplateRef } from 'vue';
import type { CSSProperties } from 'vue';
import isEmpty from 'lodash/isEmpty';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import { Role } from './enum';
import { N8nCircleLoader } from '@n8n/design-system';
const slots = useSlots();
import useTypedEffect from './useTypedEffect';

interface TypingConfig {
	step?: number;
	interval?: number;
}

type PlacementType = 'start' | 'end';
type VariantType = 'filled' | 'outlined' | 'shadow' | 'borderless';
type ShapeType = 'rounded-none' | 'rounded-small' | 'rounded-large' | 'corner';

const props = defineProps<{
	content?: string | number;
	footer?: string | number;
	header?: string | number;
	loading?: boolean;
	placement?: PlacementType;
	variant?: VariantType;
	shape?: ShapeType;
	contentStyle?: CSSProperties;
	wrapperStyle?: CSSProperties;
	headerStyle?: CSSProperties;
	footerStyle?: CSSProperties;
	typing?: boolean | TypingConfig;
	typingText?: string;
	messageRender?: ((content: string) => string) | null;
}>();

// Set default values
const {
	content = '',
	footer = '',
	header = '',
	loading = false,
	placement = 'start',
	variant = 'filled',
	shape = 'rounded-none',
	contentStyle = {},
	wrapperStyle = {},
	headerStyle = {},
	footerStyle = {},
	typing = false,
	typingText = '|',
	messageRender = null,
} = props;

const emits = defineEmits<{
	'typing-start': [element: HTMLElement];
	'typing-end': [element: HTMLElement];
}>();

const filterContentClass = computed(() => {
	return [`e-bubble-content-${variant}`, `e-bubble-content-${shape}`];
});

const filterBubbleClass = computed(() => {
	return `e-bubble-${placement}`;
});

const isNotEmpty = (value: string | number | undefined | null): boolean => {
	return (!isEmpty(value) && isString(value)) || isNumber(value);
};

const postRef = useTemplateRef<HTMLElement>('_postRef');

const { typedContent, isTyping } = useTypedEffect({
	content: content,
	typingEnabled: !!typing,
	typingStep: (typing as TypingConfig)?.step,
	typingInterval: (typing as TypingConfig)?.interval,
	onPause: () => {
		emits('typing-end', postRef.value!);
	},
	onResume: () => {
		emits('typing-start', postRef.value!);
	},
});

const filterTypedContent = computed(() => {
	return messageRender && isFunction(messageRender)
		? messageRender(typedContent.value)
		: typedContent.value;
});
</script>

<template>
	<div class="e-bubble" :class="filterBubbleClass" :role="Role[placement]">
		<div class="e-bubble-content-wrapper" :style="wrapperStyle">
			<div v-if="slots.header || isNotEmpty(header)" class="e-bubble-header" :style="headerStyle">
				<slot name="header">
					{{ header }}
				</slot>
			</div>
			<div class="e-bubble-content" :class="filterContentClass" :style="contentStyle">
				<N8nCircleLoader v-if="loading" dot :size="5" />
				<template v-else>
					<div v-if="!!slots.content" class="e-bubble-content-post">
						<slot name="content" :content="filterTypedContent"></slot>
					</div>
					<div
						v-else
						ref="_postRef"
						class="e-bubble-content-post"
						v-html="filterTypedContent"
					></div>
					<span v-if="isTyping" class="e-bubble-content-typing">
						<slot name="typing">{{ typingText }}</slot>
					</span>
				</template>
			</div>
			<div v-if="slots.footer || isNotEmpty(footer)" class="e-bubble-footer" :style="footerStyle">
				<slot name="footer">
					{{ footer }}
				</slot>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
@use './markdown.scss';
.e-bubble {
	display: flex;
	column-gap: 12px;
	font-size: var(--chat--message--font-size);
	margin-top: var(--chat--spacing);
	&.e-bubble-end {
		justify-content: end;
		flex-direction: row-reverse;
		.e-bubble-content-wrapper {
			align-items: flex-end;
		}
		.e-bubble-content {
			&-corner {
				border-radius: 8px;
				border-start-end-radius: 2px;
			}
		}
	}
	.e-bubble-header {
		margin-bottom: 4px;
	}
	.e-bubble-footer {
		margin-top: 4px;
	}
	.e-bubble-content-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;

		.e-space-item {
			min-width: 0;
			max-width: calc(100% - 32px - 12px);
		}
	}

	.e-bubble-content {
		position: relative;
		min-width: 0;
		max-width: 100%;
		@keyframes blink {
			0%,
			100% {
				opacity: 1;
			}
			50% {
				opacity: 0;
			}
		}
		&-hljs {
			color: #abb2bf;
			background: #282c34;
			padding: 16px;
			min-height: 100%;
			display: block;
		}
		&-typing {
			animation: blink 1s step-end infinite;
		}
		// Border radius styles
		&-rounded-none {
			border-radius: 0;
		}
		&-rounded-small {
			border-radius: 8px;
		}
		&-rounded-large {
			border-radius: 16px;
		}
		&-corner {
			border-radius: 8px;
			border-start-start-radius: 2px;
		}
		&-filled,
		&-outlined,
		&-shadow {
			padding: var(--chat--message--padding);
		}
		&-filled {
			// background-color: var(--chat--message--user--background);
		}
		&-outlined {
			// border: 1px solid var(--color-neutral-3);
		}
		&-shadow {
			box-shadow:
				0 1px 2px 0 rgba(0, 0, 0, 0.03),
				0 1px 6px -1px rgba(0, 0, 0, 0.02),
				0 2px 4px 0 rgba(0, 0, 0, 0.02);
		}
		&-borderless {
		}
	}
}
</style>
