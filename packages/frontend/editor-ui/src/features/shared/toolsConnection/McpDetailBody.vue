<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { McpServerConnectionItem } from './types';

const props = defineProps<{
	item: McpServerConnectionItem;
}>();

const i18n = useI18n();

const hasMetadata = computed(() => Boolean(props.item.publisher) || Boolean(props.item.version));
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.identity">
			<N8nText :class="$style.serverName" tag="h3">
				{{
					i18n.baseText(
						item.isOfficial
							? 'tools.connection.detail.officialServer'
							: 'tools.connection.detail.server',
						{ interpolate: { service: item.title } },
					)
				}}
			</N8nText>

			<p
				v-if="hasMetadata"
				:class="$style.metadata"
				data-test-id="tools-connection-detail-metadata"
			>
				<span v-if="item.publisher" :class="$style.publisher">
					{{ i18n.baseText('tools.connection.detail.publishedBy') }}
					<a
						v-if="item.publisher.url"
						:href="item.publisher.url"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.metadataLink"
					>
						{{ item.publisher.name }}
					</a>
					<span v-else>{{ item.publisher.name }}</span>
				</span>
				<span v-if="item.publisher && item.version" aria-hidden="true">&nbsp;·&nbsp;</span>
				<span v-if="item.version" :class="$style.version">
					{{
						i18n.baseText('tools.connection.detail.versionValue', {
							interpolate: { version: item.version },
						})
					}}
				</span>
			</p>
		</div>

		<p
			v-if="item.longDescription"
			:class="$style.description"
			data-test-id="tools-connection-detail-description"
		>
			{{ item.longDescription }}
		</p>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.identity {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.serverName {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
}

.metadata {
	display: flex;
	align-items: center;
	min-width: 0;
	margin: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	white-space: nowrap;
}

.publisher {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.version {
	flex-shrink: 0;
}

.metadataLink {
	color: inherit;
	text-decoration: none;

	&:hover {
		color: var(--color--primary);
		text-decoration: underline;
	}
}

.description {
	margin: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}
</style>
