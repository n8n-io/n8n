<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import type { QuickStartWorkflow } from '../data/quickStartWorkflows';

// Static workflow preview images - light mode
import chatLight from '../workflow-previews/chat.png';
import summarizeLight from '../workflow-previews/summarize.png';

// Static workflow preview images - dark mode
import chatDark from '../workflow-previews/chat-dark.png';
import summarizeDark from '../workflow-previews/summarize-dark.png';

const previewImagesLight: Record<string, string> = {
	'chat-with-the-news': chatLight,
	'summarize-the-news': summarizeLight,
};

const previewImagesDark: Record<string, string> = {
	'chat-with-the-news': chatDark,
	'summarize-the-news': summarizeDark,
};

const props = defineProps<{
	workflow: QuickStartWorkflow;
}>();

const emit = defineEmits<{
	click: [];
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const isDarkMode = computed(() => uiStore.appliedTheme === 'dark');

const nodeCount = computed(() => {
	return props.workflow.nodeCount ?? props.workflow.workflow.nodes?.length ?? 0;
});

const previewImage = computed(() => {
	const images = isDarkMode.value ? previewImagesDark : previewImagesLight;
	return images[props.workflow.id] ?? props.workflow.previewImageUrl ?? null;
});

const handleClick = () => {
	emit('click');
};
</script>

<template>
	<div :class="$style.card" @click="handleClick">
		<div :class="$style.imageContainer">
			<img v-if="previewImage" :src="previewImage" :alt="workflow.name" :class="$style.image" />
			<div v-else :class="$style.imagePlaceholder" />
		</div>
		<div :class="$style.content">
			<div :class="$style.info">
				<div :class="$style.tag">
					<N8nIcon icon="workflow" :class="$style.tagIcon" size="small" />
					{{ i18n.baseText('experiments.resourceCenter.sandbox.easySetupWorkflow') }}
				</div>
				<h3 :class="$style.title">{{ workflow.name }}</h3>
				<span :class="$style.nodeCount">
					{{
						i18n.baseText('experiments.resourceCenter.sandbox.nodes', {
							interpolate: { count: nodeCount },
						})
					}}
				</span>
			</div>
			<div :class="$style.actions">
				<N8nButton
					:label="i18n.baseText('experiments.resourceCenter.sandbox.tryItNow')"
					type="secondary"
					size="small"
					@click.stop="handleClick"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: row;
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
	overflow: hidden;
	cursor: pointer;
	transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);

	&:hover {
		border-color: var(--color--foreground--shade-1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}
}

.imageContainer {
	width: 320px;
	min-width: 320px;
	height: 180px;
	overflow: hidden;
	background-color: var(--color--foreground--tint-2);
}

.image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.imagePlaceholder {
	width: 100%;
	height: 100%;
	background: linear-gradient(
		135deg,
		var(--color--foreground--tint-2) 0%,
		var(--color--foreground--tint-1) 100%
	);
}

.content {
	flex: 1;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--lg);
	gap: var(--spacing--lg);
}

.info {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.tag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	width: fit-content;
}

.tagIcon {
	color: var(--color--success--shade-1);
}

.title {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0;
	line-height: var(--line-height--md);
}

.nodeCount {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
}

.actions {
	display: flex;
	align-items: center;
}
</style>
