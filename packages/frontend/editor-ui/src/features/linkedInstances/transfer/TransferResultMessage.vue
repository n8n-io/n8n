<script setup lang="ts">
import type { LinkedInstancePushResult } from '@n8n/api-types';
import { N8nExternalLink, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { transferResultView, type RemoteCopyState } from './transferResult';

/**
 * The body of the toast after a move. Names, node types and warnings can repeat text of the linked
 * instance, so they render as text only. Every link opens in a new tab without an opener.
 */
const props = defineProps<{
	result: LinkedInstancePushResult;
	/** The name of the link. */
	place: string;
	/** The address of the linked instance, for the links to its credentials. */
	baseUrl: string;
}>();

const REMOTE_STATE_TEXT: Record<RemoteCopyState, BaseTextKey> = {
	live: 'linkedInstances.transfer.result.live',
	earlierLive: 'linkedInstances.transfer.result.earlierLive',
	notLive: 'linkedInstances.transfer.result.notLive',
};

const i18n = useI18n();
const view = computed(() => transferResultView(props.result, props.baseUrl));
const interpolate = computed(() => ({ place: props.place }));
const newTab = computed(() => i18n.baseText('linkedInstances.transfer.newTab'));

// Each link names its credential, so a list of links reads well without the item text.
function setUpLabel(credential: string): string {
	const label = i18n.baseText('linkedInstances.transfer.result.setUp.linkLabel', {
		interpolate: { place: props.place, credential },
	});
	return `${label} ${newTab.value}`;
}
</script>

<template>
	<div :class="$style.message" data-test-id="transfer-result-message">
		<N8nText tag="p" size="small">
			{{ i18n.baseText(REMOTE_STATE_TEXT[view.remoteState], { interpolate }) }}
			<template v-if="view.turnedOffHere">
				{{ i18n.baseText('linkedInstances.transfer.result.turnedOffHere') }}
			</template>
		</N8nText>
		<ul
			v-if="view.warnings.length > 0"
			:class="$style.list"
			data-test-id="transfer-result-warnings"
		>
			<li v-for="(warning, index) in view.warnings" :key="index">
				<N8nText size="small">{{ warning }}</N8nText>
			</li>
		</ul>
		<template v-if="view.needsSetUp.length > 0">
			<N8nText tag="p" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.result.setUp.heading', { interpolate }) }}
			</N8nText>
			<ul :class="$style.list" data-test-id="transfer-result-set-up">
				<li v-for="credential in view.needsSetUp" :key="credential.id" :class="$style.setUpItem">
					<N8nText size="small">{{ credential.name }}</N8nText>
					<N8nExternalLink
						v-if="credential.url"
						:href="credential.url"
						size="small"
						:aria-label="setUpLabel(credential.name)"
					>
						{{ i18n.baseText('linkedInstances.transfer.result.setUp.link', { interpolate }) }}
					</N8nExternalLink>
				</li>
			</ul>
		</template>
		<template v-if="view.missingNodeTypes.length > 0">
			<N8nText tag="p" size="small" bold>
				{{ i18n.baseText('linkedInstances.transfer.result.nodeTypes.heading', { interpolate }) }}
			</N8nText>
			<ul :class="$style.list" data-test-id="transfer-result-node-types">
				<li v-for="nodeType in view.missingNodeTypes" :key="nodeType">
					<code :class="$style.code">{{ nodeType }}</code>
				</li>
			</ul>
		</template>
		<N8nExternalLink
			v-if="view.openUrl"
			:href="view.openUrl"
			:class="$style.open"
			data-test-id="transfer-result-open"
		>
			{{ i18n.baseText('linkedInstances.transfer.result.open', { interpolate }) }}
			<span :class="$style.visuallyHidden">{{ newTab }}</span>
		</N8nExternalLink>
	</div>
</template>

<style lang="scss" module>
.message {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--3xs);
}

.list {
	margin: 0;
	padding-left: var(--spacing--sm);
	list-style: disc;
}

.setUpItem {
	display: list-item;

	> * {
		vertical-align: middle;
	}
}

.code {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.open {
	margin-left: calc(-1 * var(--spacing--2xs));
}

.visuallyHidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}
</style>
