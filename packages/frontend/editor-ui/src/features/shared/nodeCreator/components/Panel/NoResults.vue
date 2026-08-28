<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nLink } from '@n8n/design-system';
import { REGULAR_NODE_CREATOR_VIEW, TRIGGER_NODE_CREATOR_VIEW } from '@/app/constants';
import type { NodeFilterType } from '@/Interface';

defineProps<{
	query: string;
	rootView?: NodeFilterType;
}>();

const emit = defineEmits<{
	addHttpNode: [];
	addWebhookNode: [];
}>();
const i18n = useI18n();
</script>

<template>
	<div :class="$style.noResults" data-test-id="node-creator-no-results">
		<p :class="$style.title">
			{{
				i18n.baseText('nodeCreator.noResults.noResultsFor', {
					interpolate: { query },
				})
			}}
		</p>
		<p
			v-if="rootView === REGULAR_NODE_CREATOR_VIEW || rootView === TRIGGER_NODE_CREATOR_VIEW"
			:class="$style.action"
		>
			{{ i18n.baseText('nodeCreator.noResults.connectUsingSuggestedNode') }}
			<template v-if="rootView === TRIGGER_NODE_CREATOR_VIEW">
				<N8nLink size="small" theme="text" underline @click="emit('addWebhookNode')">
					{{ i18n.baseText('nodeCreator.noResults.webhook') }}
				</N8nLink>
				{{ `${i18n.baseText('nodeCreator.noResults.or')} ` }}
			</template>
			<N8nLink size="small" theme="text" underline @click="emit('addHttpNode')">
				{{ i18n.baseText('nodeCreator.noResults.httpRequest') }}
			</N8nLink>
			{{ i18n.baseText('nodeCreator.noResults.node') }}
		</p>
	</div>
</template>

<style lang="scss" module>
.noResults {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	text-align: center;
	font-weight: var(--font-weight--regular);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);

	p {
		margin: 0;
	}
}

.action {
	margin-top: var(--spacing--4xs);
}

.title {
	font-size: var(--font-size--sm);
}
</style>
