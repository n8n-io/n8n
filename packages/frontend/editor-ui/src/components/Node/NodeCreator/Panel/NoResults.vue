<script setup lang="ts">
import {
	REQUEST_NODE_FORM_URL,
	REGULAR_NODE_CREATOR_VIEW,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/constants';
import type { NodeFilterType } from '@/Interface';

import NoResultsIcon from './NoResultsIcon.vue';
import { useI18n } from '@n8n/i18n';

export interface Props {
	showIcon?: boolean;
	showRequest?: boolean;
	rootView?: NodeFilterType;
}

defineProps<Props>();
const i18n = useI18n();
</script>

<template>
	<div
		:class="{ [$style.noResults]: true, [$style.iconless]: !showIcon }"
		data-test-id="node-creator-no-results"
	>
		<div v-if="showIcon" :class="$style.icon">
			<NoResultsIcon />
		</div>
		<div :class="$style.title">
			<slot name="title" />
			<p v-text="i18n.baseText('nodeCreator.noResults.weDidntMakeThatYet')" />
			<div
				v-if="rootView === REGULAR_NODE_CREATOR_VIEW || rootView === TRIGGER_NODE_CREATOR_VIEW"
				:class="$style.action"
			>
				{{ i18n.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
				<n8n-link v-if="rootView === REGULAR_NODE_CREATOR_VIEW" @click="$emit('addHttpNode')">
					{{ i18n.baseText('nodeCreator.noResults.httpRequest') }}
				</n8n-link>

				<n8n-link v-if="rootView === TRIGGER_NODE_CREATOR_VIEW" @click="$emit('addWebhookNode')">
					{{ i18n.baseText('nodeCreator.noResults.webhook') }}
				</n8n-link>
				{{ i18n.baseText('nodeCreator.noResults.node') }}
			</div>
		</div>

		<div v-if="showRequest" :class="$style.request">
			<p v-text="i18n.baseText('nodeCreator.noResults.wantUsToMakeItFaster')" />
			<div>
				<n8n-link :to="REQUEST_NODE_FORM_URL">
					<span>{{ i18n.baseText('nodeCreator.noResults.requestTheNode') }}</span
					>&nbsp;
					<span>
						<n8n-icon
							:class="$style.external"
							icon="external-link"
							:title="i18n.baseText('nodeCreator.noResults.requestTheNode')"
						/>
					</span>
				</n8n-link>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.noResults {
	background-color: $node-creator-no-results-background-color;
	text-align: center;
	height: 100%;
	border-left: 1px solid $node-creator-border-color;
	flex-direction: column;
	font-weight: var(--font-weight-regular);
	display: flex;
	align-items: center;
	align-content: center;
	padding: 0 var(--spacing-2xl);
}

.title {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-regular);
	margin-top: var(--spacing-xs);

	div {
		margin-bottom: var(--spacing-s);
	}
}

.action p,
.request p {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-xloose);
}

.request {
	position: fixed;
	bottom: var(--spacing-m);
	display: none;

	@media (min-height: 550px) {
		display: block;
	}
}

.icon {
	margin-top: var(--spacing-2xl);
	min-height: 67px;
	opacity: 0.6;
}

.external {
	font-size: var(--font-size-2xs);
}
</style>
