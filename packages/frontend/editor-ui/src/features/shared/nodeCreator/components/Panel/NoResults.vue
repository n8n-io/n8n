<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nLink } from '@n8n/design-system';
import { REGULAR_NODE_CREATOR_VIEW, TRIGGER_NODE_CREATOR_VIEW } from '@/app/constants';
import type { NodeFilterType } from '@/Interface';
import {
	canMakeHttpActions,
	HTTP_ACTION_VIEW,
	startHttpActionDraft,
} from '@n8n/frontend-module-next-nodes-instance';
import { useRouter } from 'vue-router';

const props = withDefaults(
	defineProps<{
		query: string;
		rootView?: NodeFilterType;
		suggestHttpRequest?: boolean;
		suggestWebhook?: boolean;
	}>(),
	{ rootView: undefined, suggestHttpRequest: true, suggestWebhook: true },
);

const emit = defineEmits<{
	addHttpNode: [];
	addWebhookNode: [];
}>();
const i18n = useI18n();

const showWebhook = computed(
	() => props.suggestWebhook && props.rootView === TRIGGER_NODE_CREATOR_VIEW,
);
// A custom action is not a trigger, so only the regular view offers one.
const showCustomAction = computed(
	() => props.rootView === REGULAR_NODE_CREATOR_VIEW && canMakeHttpActions(),
);

const router = useRouter();

/** Opens the form in a new tab, so the workflow stays open. */
function makeCustomAction() {
	startHttpActionDraft(props.query.trim());
	window.open(router.resolve({ name: HTTP_ACTION_VIEW }).href, '_blank');
}

const showHttpRequest = computed(
	() =>
		props.suggestHttpRequest &&
		(props.rootView === REGULAR_NODE_CREATOR_VIEW || props.rootView === TRIGGER_NODE_CREATOR_VIEW),
);
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
		<p v-if="showWebhook || showHttpRequest" :class="$style.action">
			{{ i18n.baseText('nodeCreator.noResults.connectUsingSuggestedNode') }}
			<template v-if="showWebhook">
				<N8nLink size="small" theme="text" underline @click="emit('addWebhookNode')">
					{{ i18n.baseText('nodeCreator.noResults.webhook') }}
				</N8nLink>
				<template v-if="showHttpRequest">{{
					` ${i18n.baseText('nodeCreator.noResults.or')} `
				}}</template>
			</template>
			<N8nLink
				v-if="showHttpRequest"
				size="small"
				theme="text"
				underline
				@click="emit('addHttpNode')"
			>
				{{ i18n.baseText('nodeCreator.noResults.httpRequest') }}
			</N8nLink>
			{{ i18n.baseText('nodeCreator.noResults.node') }}
		</p>
		<p v-if="showCustomAction" :class="$style.action">
			{{ i18n.baseText('nodeCreator.noResults.customAction.prompt') }}
			<N8nLink
				size="small"
				theme="text"
				underline
				data-test-id="node-creator-make-custom-action"
				@click="makeCustomAction"
			>
				{{ i18n.baseText('nodeCreator.noResults.customAction') }}
			</N8nLink>
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
