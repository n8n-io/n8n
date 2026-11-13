<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { WouldHaveHappenedPreview } from './wouldHaveHappened.types';
import { presentText } from './wouldHaveHappened.utils';

/**
 * The shared shell of a preview card: app icon, heading, the tool and app
 * names, and the "not sent" marker. Each preview kind fills the body.
 */
const props = defineProps<{
	preview: WouldHaveHappenedPreview;
	heading: string;
	icon: IconName;
	/** Show the empty message instead of the body. */
	empty?: boolean;
	emptyText?: string;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => {
	const name = props.preview.app?.nodeType;
	return name ? nodeTypesStore.getNodeType(name) : null;
});

const appName = computed(() => presentText(props.preview.app?.name)?.trim());
const toolName = computed(() => presentText(props.preview.toolName)?.trim());

const meta = computed(() =>
	[appName.value, toolName.value !== props.heading ? toolName.value : undefined].filter(
		(part): part is string => Boolean(part),
	),
);
</script>

<template>
	<article
		:class="$style.card"
		:aria-label="heading"
		:data-preview-kind="preview.kind"
		data-test-id="would-have-happened-card"
	>
		<header :class="$style.header">
			<span :class="$style.icon" aria-hidden="true">
				<NodeIcon v-if="nodeType" :node-type="nodeType" :size="16" />
				<N8nIcon v-else :icon="icon" size="medium" />
			</span>
			<div :class="$style.titleBlock">
				<N8nText tag="span" size="small" bold :class="$style.heading">{{ heading }}</N8nText>
				<N8nText
					v-if="meta.length > 0"
					tag="span"
					size="xsmall"
					:class="$style.meta"
					data-test-id="would-have-happened-meta"
				>
					{{ meta.join(' · ') }}
				</N8nText>
			</div>
			<span :class="$style.marker" data-test-id="would-have-happened-not-sent">
				<N8nIcon icon="flask-conical" size="xsmall" aria-hidden="true" />
				{{ i18n.baseText('agents.testRun.preview.notSent') }}
			</span>
		</header>
		<div :class="$style.body">
			<p v-if="empty" :class="$style.empty" data-test-id="would-have-happened-empty">
				{{ emptyText ?? i18n.baseText('agents.testRun.preview.empty') }}
			</p>
			<slot v-else />
		</div>
	</article>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: min(520px, calc(100vw - var(--spacing--4xl)));
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--sm);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.icon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	color: var(--text-color--subtle);
}

.titleBlock {
	display: flex;
	flex: 1 1 8rem;
	flex-wrap: wrap;
	align-items: baseline;
	column-gap: var(--spacing--3xs);
	min-width: 0;
}

.heading {
	color: var(--text-color);
	overflow-wrap: anywhere;
}

.meta {
	color: var(--text-color--subtle);
	overflow-wrap: anywhere;
}

.marker {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--sm);
	max-width: 100%;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.empty {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
</style>
