<script lang="ts" setup>
import sanitize from 'sanitize-html';
import { computed, ref, useCssModule } from 'vue';

import N8nText from '../../components/N8nText';
import { uid } from '../../utils';

interface NoticeProps {
	id?: string;
	theme?: 'success' | 'warning' | 'danger' | 'info';
	content?: string;
	fullContent?: string;
	compact?: boolean;
}

const props = withDefaults(defineProps<NoticeProps>(), {
	id: () => uid('notice'),
	theme: 'warning',
	content: '',
	fullContent: '',
	compact: true,
});

const emit = defineEmits<{
	action: [key: string];
}>();

const $style = useCssModule();

const classes = computed(() => ['notice', $style.notice, $style[props.theme]]);
const canTruncate = computed(() => props.fullContent !== undefined);

const showFullContent = ref(false);
const displayContent = computed(() =>
	sanitize(showFullContent.value ? props.fullContent : props.content, {
		allowedAttributes: {
			a: [
				'data-key',
				'href',
				'target',
				'data-action',
				'data-action-parameter-connectiontype',
				'data-action-parameter-creatorview',
			],
		},
	}),
);

const onClick = (event: MouseEvent) => {
	if (!(event.target instanceof HTMLElement)) return;

	if (event.target.localName !== 'a') return;

	const anchorKey = event.target.dataset?.key;
	if (anchorKey) {
		event.stopPropagation();
		event.preventDefault();

		if (anchorKey === 'show-less') {
			showFullContent.value = false;
		} else if (canTruncate.value && anchorKey === 'toggle-expand') {
			showFullContent.value = !showFullContent.value;
		} else {
			emit('action', anchorKey);
		}
	}
};
</script>

<template>
	<div :id="id" :class="classes" role="alert" @click="onClick">
		<div class="notice-content">
			<N8nText size="small" :compact="compact">
				<slot>
					<span
						:id="`${id}-content`"
						v-n8n-html="displayContent"
						:class="showFullContent ? $style['expanded'] : $style['truncated']"
						role="region"
					/>
				</slot>
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.notice {
	font-size: var(--font-size--2xs);
	display: flex;
	color: var(--color-notice-font);
	margin: var(--notice-margin, var(--spacing--sm) 0);
	padding: var(--spacing--2xs);
	background-color: var(--background-color);
	border-width: 1px 1px 1px 7px;
	border-style: solid;
	border-color: var(--border-color);
	border-radius: var(--radius--sm);
	line-height: var(--line-height--sm);

	a {
		font-weight: var(--font-weight--bold);
	}
}

.warning {
	--border-color: var(--color-notice-warning-border);
	--background-color: var(--color-notice-warning-background);
}

.danger {
	--border-color: var(--color--danger--tint-3);
	--background-color: var(--color--danger--tint-4);
}

.success {
	--border-color: var(--color--success--tint-3);
	--background-color: var(--color--success--tint-4);
}

.info {
	--border-color: var(--color-info-tint-1);
	--background-color: var(--color-info-tint-2);
}

.expanded {
	+ span {
		margin-top: var(--spacing--4xs);
		display: block;
	}
}

.truncated {
	display: inline;
}
</style>
