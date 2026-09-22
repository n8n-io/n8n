<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { McpServerConnectionItem } from './types';

const props = defineProps<{
	item: McpServerConnectionItem;
}>();

const i18n = useI18n();

const hasMetadata = computed(
	() => Boolean(props.item.publisher) || Boolean(props.item.version) || Boolean(props.item.docsUrl),
);
</script>

<template>
	<div :class="$style.container">
		<p v-if="item.longDescription" :class="$style.description">
			{{ item.longDescription }}
		</p>

		<div
			v-if="hasMetadata"
			:class="$style.metadata"
			data-test-id="tools-connection-detail-metadata"
		>
			<div v-if="item.publisher" :class="$style.metadataCell">
				<N8nText :class="$style.metadataLabel" size="small">
					{{ i18n.baseText('tools.connection.detail.publisher') }}
				</N8nText>
				<a
					v-if="item.publisher.url"
					:href="item.publisher.url"
					target="_blank"
					rel="noopener noreferrer"
					:class="$style.metadataLink"
				>
					{{ item.publisher.name }}
				</a>
				<N8nText v-else size="small" color="text-light">{{ item.publisher.name }}</N8nText>
			</div>
			<div v-if="item.version" :class="$style.metadataCell">
				<N8nText :class="$style.metadataLabel" size="small">
					{{ i18n.baseText('tools.connection.detail.version') }}
				</N8nText>
				<N8nText size="small" color="text-light">{{ item.version }}</N8nText>
			</div>
			<div v-if="item.docsUrl" :class="$style.metadataCell">
				<N8nText :class="$style.metadataLabel" size="small">
					{{ i18n.baseText('tools.connection.detail.moreInfo') }}
				</N8nText>
				<a
					:href="item.docsUrl"
					target="_blank"
					rel="noopener noreferrer"
					:class="$style.metadataLink"
				>
					{{ i18n.baseText('tools.connection.detail.docs') }}
				</a>
			</div>
		</div>

		<div v-if="hasMetadata" :class="$style.divider" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.description {
	margin: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.metadata {
	display: flex;
	gap: var(--spacing--xl);
}

.metadataCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.metadataLabel {
	text-transform: uppercase;
	letter-spacing: 0.06em;
	font-size: var(--font-size--3xs);
}

.metadataLink {
	color: var(--text-color--subtler);
	text-decoration: underline;
	font-size: var(--font-size--2xs);

	&:hover {
		color: var(--color--primary);
	}
}

.divider {
	height: 1px;
	background: var(--color--foreground--shade-1);
}
</style>
