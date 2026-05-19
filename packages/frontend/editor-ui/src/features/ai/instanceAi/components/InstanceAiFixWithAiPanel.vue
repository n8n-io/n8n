<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import ConfirmationFooter from './ConfirmationFooter.vue';
import AnimatedCollapsibleContent from './AnimatedCollapsibleContent.vue';

const props = withDefaults(
	defineProps<{
		nodeName: string;
		errorMessage: string;
		failedCount?: number;
	}>(),
	{ failedCount: 1 },
);

defineEmits<{
	'fix-with-ai': [];
	dismiss: [];
}>();

const i18n = useI18n();
const isErrorDetailsOpen = ref(false);

const title = computed(() =>
	props.failedCount > 1
		? i18n.baseText('instanceAi.fixWithAi.notice.title.multiple', {
				interpolate: { count: props.failedCount },
			})
		: i18n.baseText('instanceAi.fixWithAi.notice.title.single', {
				interpolate: { nodeName: props.nodeName },
			}),
);
</script>

<template>
	<div :class="$style.root" role="alert" data-test-id="instance-ai-fix-with-ai-panel">
		<div :class="$style.header">
			<N8nIcon icon="circle-x" size="medium" :class="$style.headerIcon" />
			<N8nText bold tag="span" :class="$style.title">{{ title }}</N8nText>
		</div>
		<div :class="$style.body">
			<CollapsibleRoot v-model:open="isErrorDetailsOpen">
				<CollapsibleTrigger as-child>
					<button
						type="button"
						:class="$style.toggle"
						data-test-id="instance-ai-fix-with-ai-error-toggle"
					>
						<N8nIcon :icon="isErrorDetailsOpen ? 'chevron-down' : 'chevron-right'" size="small" />
						<N8nText size="small">{{ i18n.baseText('instanceAi.fixWithAi.errorDetails') }}</N8nText>
					</button>
				</CollapsibleTrigger>
				<AnimatedCollapsibleContent>
					<pre :class="$style.codeBlock"><code>{{ errorMessage }}</code></pre>
				</AnimatedCollapsibleContent>
			</CollapsibleRoot>
		</div>
		<ConfirmationFooter layout="row-end" bordered>
			<N8nButton
				variant="outline"
				size="medium"
				data-test-id="instance-ai-fix-with-ai-dismiss"
				@click="$emit('dismiss')"
			>
				{{ i18n.baseText('instanceAi.fixWithAi.notice.dismiss') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				size="medium"
				icon="sparkles"
				data-test-id="instance-ai-fix-with-ai-button"
				@click="$emit('fix-with-ai')"
			>
				{{ i18n.baseText('instanceAi.fixWithAi.button') }}
			</N8nButton>
		</ConfirmationFooter>
	</div>
</template>

<style module lang="scss">
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background-color: var(--color--background--light-3);
	max-width: 90%;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.headerIcon {
	flex-shrink: 0;
	color: var(--color--danger);
}

.title {
	flex: 1;
	min-width: 0;
}

.dismiss {
	flex-shrink: 0;
	margin-right: calc(-1 * var(--spacing--4xs));
}

.body {
	padding: var(--spacing--2xs) var(--spacing--sm);
}

.toggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--4xs) 0;
	border: none;
	background: transparent;
	cursor: pointer;
	color: var(--color--text--tint-1);
	text-align: left;

	&:hover {
		color: var(--color--text);
	}
}

.codeBlock {
	margin: var(--spacing--3xs) 0 0;
	padding: var(--spacing--2xs);
	font-family: monospace;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--color--text);
	background: light-dark(var(--color--background), var(--color--neutral-850));
	border: var(--border);
	border-radius: var(--radius);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 12rem;
	overflow: auto;
	overscroll-behavior: contain;
}

.codeBlock code {
	font-family: inherit;
	font-size: inherit;
}
</style>
