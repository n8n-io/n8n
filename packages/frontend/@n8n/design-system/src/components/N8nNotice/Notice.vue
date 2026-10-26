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
		allowedTags: ['a', 'ul', 'li'],
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
	color: var(--notice--color--text);
	margin: var(--notice--margin, var(--spacing--sm) 0);
	padding: var(--spacing--2xs);
	background-color: var(--notice--color--background);
	border: 1px solid var(--notice--color--border-color);
	border-radius: var(--radius--xs);
	line-height: var(--line-height--sm);

	a {
		font-weight: var(--font-weight--medium);
	}

	ul {
		padding-left: var(--spacing--lg);
		margin: var(--spacing--xs) 0;
	}

	li {
		margin-bottom: var(--spacing--4xs);
	}
}

.warning {
	--notice--color--border-color: var(--color--yellow-500);
	--notice--color--background: light-dark(
		var(--color--yellow-50),
		color-mix(in srgb, var(--color--yellow-500), transparent 80%)
	);
	--notice--color--text: light-dark(var(--color--yellow-950), var(--text-color));
}

.danger {
	--notice--color--border-color: var(--color--red-500);
	--notice--color--background: light-dark(
		var(--color--red-50),
		color-mix(in srgb, var(--color--red-500), transparent 80%)
	);
	--notice--color--text: light-dark(var(--color--red-950), var(--text-color));
}

.success {
	--notice--color--border-color: var(--color--green-500);
	--notice--color--background: light-dark(
		var(--color--green-50),
		color-mix(in srgb, var(--color--green-500), transparent 80%)
	);
	--notice--color--text: light-dark(var(--color--green-950), var(--text-color));
}

.info {
	--notice--color--border-color: var(--color--blue-500);
	--notice--color--background: light-dark(
		var(--color--blue-50),
		color-mix(in srgb, var(--color--blue-500), transparent 80%)
	);
	--notice--color--text: light-dark(var(--color--blue-950), var(--text-color));
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
