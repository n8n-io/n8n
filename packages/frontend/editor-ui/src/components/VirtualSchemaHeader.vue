<script lang="ts" setup>
import { computed } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { type INodeTypeDescription } from 'n8n-workflow';
import { useI18n } from '@/composables/useI18n';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { DATA_EDITING_DOCS_URL } from '@/constants';
import { N8nNotice } from '@n8n/design-system';

const props = defineProps<{
	title: string;
	info?: string;
	collapsable: boolean;
	collapsed: boolean;
	nodeType: INodeTypeDescription;
	itemCount: number | null;
	preview?: boolean;
}>();

const i18n = useI18n();
const isTrigger = computed(() => props.nodeType.group.includes('trigger'));
const emit = defineEmits<{
	'click:toggle': [];
}>();
</script>

<template>
	<div class="schema-header-wrapper">
		<div class="schema-header" data-test-id="run-data-schema-header">
			<div class="toggle" @click.capture.stop="emit('click:toggle')">
				<FontAwesomeIcon icon="angle-down" :class="{ 'collapse-icon': true, collapsed }" />
			</div>

			<NodeIcon
				class="icon"
				:class="{ ['icon-trigger']: isTrigger }"
				:node-type="nodeType"
				:size="12"
			/>
			<div class="title">
				{{ title }}
				<span v-if="info" class="info">{{ info }}</span>
			</div>
			<FontAwesomeIcon v-if="isTrigger" class="trigger-icon" icon="bolt" size="xs" />
			<div v-if="itemCount" class="item-count" data-test-id="run-data-schema-node-item-count">
				{{ i18n.baseText('ndv.output.items', { interpolate: { count: itemCount } }) }}
			</div>
		</div>
		<N8nNotice
			v-if="preview && !collapsed"
			class="notice"
			theme="warning"
			data-test-id="schema-preview-warning"
		>
			<i18n-t keypath="dataMapping.schemaView.preview">
				<template #link>
					<N8nLink :to="DATA_EDITING_DOCS_URL" size="small">
						{{ i18n.baseText('generic.learnMore') }}
					</N8nLink>
				</template>
			</i18n-t>
		</N8nNotice>
	</div>
</template>

<style lang="scss" scoped>
.schema-header-wrapper {
	padding-bottom: var(--spacing-2xs);
}
.schema-header {
	display: flex;
	align-items: center;
	cursor: pointer;
}
.toggle {
	width: 30px;
	height: 30px;
	display: flex;
	justify-content: center;
	align-items: center;
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
	padding: var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	margin-right: var(--spacing-2xs);
}

.icon-trigger {
	border-radius: 16px 4px 4px 16px;
}

.title {
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
}

.info {
	margin-left: var(--spacing-2xs);
	color: var(--color-text-light);
	font-weight: var(--font-weight-regular);
}

.trigger-icon {
	margin-left: var(--spacing-2xs);
	color: var(--color-primary);
}

.item-count {
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
	margin-left: auto;
}

.notice {
	margin-left: var(--spacing-2xl);
	margin-top: var(--spacing-2xs);
	margin-bottom: 0;
}
</style>
