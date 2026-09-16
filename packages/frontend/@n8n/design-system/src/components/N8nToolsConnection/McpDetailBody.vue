<script setup lang="ts">
import { computed } from 'vue';
import N8nText from '../N8nText';
import { useI18n } from '@n8n/i18n';
import type { McpServerConnectionItem, McpServerTool } from './types';

const props = defineProps<{
	item: McpServerConnectionItem;
}>();

const i18n = useI18n();

const readTools = computed<McpServerTool[]>(() =>
	props.item.availableTools.filter((tool) => tool.category === 'read'),
);

const writeTools = computed<McpServerTool[]>(() =>
	props.item.availableTools.filter((tool) => tool.category === 'write'),
);

const otherTools = computed<McpServerTool[]>(() =>
	props.item.availableTools.filter((tool) => tool.category === undefined),
);

const hasMetadata = computed(
	() => Boolean(props.item.publisher) || Boolean(props.item.version) || Boolean(props.item.docsUrl),
);
</script>

<template>
	<div :class="$style.container">
		<N8nText v-if="item.longDescription" tag="p" step="sm">
			{{ item.longDescription }}
		</N8nText>

		<div
			v-if="hasMetadata"
			:class="$style.metadata"
			data-test-id="tools-connection-detail-metadata"
		>
			<div v-if="item.publisher" :class="$style.metadataCell">
				<N8nText :class="$style.label" color="text-light" bold step="sm">
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
				<N8nText v-else color="text-light" step="sm">{{ item.publisher.name }}</N8nText>
			</div>
			<div v-if="item.version" :class="$style.metadataCell">
				<N8nText :class="$style.label" color="text-light" bold step="xs">
					{{ i18n.baseText('tools.connection.detail.version') }}
				</N8nText>
				<N8nText step="sm">{{ item.version }}</N8nText>
			</div>
			<div v-if="item.docsUrl" :class="$style.metadataCell">
				<N8nText :class="$style.label" color="text-light" bold step="xs">
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

		<section v-if="readTools.length > 0" :class="$style.toolsSection">
			<div :class="$style.toolsHeader">
				<N8nText :class="$style.label" color="text-light" bold step="xs">
					{{ i18n.baseText('tools.connection.detail.readTools') }}
				</N8nText>
				<span :class="$style.toolsCount">{{ readTools.length }}</span>
			</div>
			<div :class="$style.chipList" data-test-id="tools-connection-detail-read-tools">
				<span
					v-for="tool in readTools"
					:key="tool.id"
					:class="$style.chip"
					data-test-id="tools-connection-detail-tool"
				>
					{{ tool.name }}
				</span>
			</div>
		</section>

		<section v-if="writeTools.length > 0" :class="$style.toolsSection">
			<div :class="$style.toolsHeader">
				<N8nText :class="$style.label" color="text-light" bold step="xs">
					{{ i18n.baseText('tools.connection.detail.writeTools') }}
				</N8nText>
				<span :class="$style.toolsCount">{{ writeTools.length }}</span>
			</div>
			<div :class="$style.chipList" data-test-id="tools-connection-detail-write-tools">
				<span
					v-for="tool in writeTools"
					:key="tool.id"
					:class="$style.chip"
					data-test-id="tools-connection-detail-tool"
				>
					{{ tool.name }}
				</span>
			</div>
		</section>

		<section v-if="otherTools.length > 0" :class="$style.toolsSection">
			<div :class="$style.toolsHeader">
				<N8nText :class="$style.label" color="text-light" bold step="xs">
					{{ i18n.baseText('tools.connection.detail.otherTools') }}
				</N8nText>
				<span :class="$style.toolsCount">{{ otherTools.length }}</span>
			</div>
			<div :class="$style.chipList" data-test-id="tools-connection-detail-other-tools">
				<span
					v-for="tool in otherTools"
					:key="tool.id"
					:class="$style.chip"
					data-test-id="tools-connection-detail-tool"
				>
					{{ tool.name }}
				</span>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.metadata {
	display: flex;
	gap: var(--spacing--xl);
}

.metadataCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.label {
	user-select: none;
}

.metadataLink {
	color: var(--text-color);
	text-decoration: underline;
	line-height: var(--line-height--sm);
	font-size: var(--font-size--sm);

	&:hover {
		color: var(--color--primary);
	}
}

.divider {
	height: 1px;
	background: var(--color--foreground--shade-1);
}

.toolsSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.toolsHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.toolsCount {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 22px;
	height: 18px;
	padding: 0 var(--spacing--4xs);
	border-radius: 9px;
	background: var(--color--foreground--shade-1);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.chipList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	background: var(--color--background--light-1);
}
</style>
