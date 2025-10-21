<script lang="ts" setup>
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { type INodeTypeDescription } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { SCHEMA_PREVIEW_DOCS_URL } from '@/constants';

import { N8nIcon, N8nLink } from '@n8n/design-system';
import { I18nT } from 'vue-i18n';
const props = defineProps<{
	title: string;
	collapsable: boolean;
	collapsed: boolean;
	itemCount: number | null;
	info?: string;
	nodeType?: INodeTypeDescription;
	preview?: boolean;
}>();

const i18n = useI18n();
const isTrigger = computed(() => Boolean(props.nodeType?.group.includes('trigger')));
const emit = defineEmits<{
	'click:toggle': [];
}>();
</script>

<template>
	<div class="schema-header-wrapper">
		<div class="schema-header" data-test-id="run-data-schema-header">
			<div class="toggle" @click.capture.stop="emit('click:toggle')">
				<N8nIcon size="medium" icon="chevron-down" :class="{ 'collapse-icon': true, collapsed }" />
			</div>

			<NodeIcon
				v-if="nodeType"
				class="icon"
				:class="{ ['icon-trigger']: isTrigger }"
				:node-type="nodeType"
				:size="12"
			/>
			<div class="title">
				{{ title }}
				<span v-if="info" class="info">{{ info }}</span>
			</div>
			<N8nIcon v-if="isTrigger" class="trigger-icon" icon="bolt-filled" size="xsmall" />
			<div v-if="itemCount" class="extra-info" data-test-id="run-data-schema-node-item-count">
				{{ i18n.baseText('ndv.output.items', { interpolate: { count: itemCount } }) }}
			</div>
			<div v-else-if="preview" class="extra-info">
				{{ i18n.baseText('dataMapping.schemaView.previewNode') }}
			</div>
		</div>
		<div
			v-if="preview && !collapsed"
			class="notice"
			data-test-id="schema-preview-warning"
			@click.stop
		>
			<I18nT keypath="dataMapping.schemaView.preview" scope="global">
				<template #link>
					<N8nLink :to="SCHEMA_PREVIEW_DOCS_URL" size="small" bold>
						{{ i18n.baseText('generic.learnMore') }}
					</N8nLink>
				</template>
			</I18nT>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.schema-header-wrapper {
	padding-bottom: var(--spacing--2xs);
}
.schema-header {
	display: flex;
	align-items: center;
	cursor: pointer;
}
.toggle {
	padding-left: var(--spacing--5xs);
	padding-right: var(--spacing--3xs);
	height: 30px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color--text--tint-1);
}
.collapse-icon {
	transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}
.collapsed {
	transform: rotateZ(-90deg);
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--3xs);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
	margin-right: var(--spacing--2xs);
}

.icon-trigger {
	border-radius: 16px 4px 4px 16px;
}

.title {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.info {
	margin-left: var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
}

.trigger-icon {
	margin-left: var(--spacing--2xs);
	color: var(--color--primary);
}

.extra-info {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	margin-left: auto;
	white-space: nowrap;
}

.notice {
	margin-left: var(--spacing--2xl);
	margin-top: var(--spacing--2xs);
	padding-bottom: var(--spacing--2xs);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
}
</style>
