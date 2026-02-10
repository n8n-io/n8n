<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nText, N8nLink, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import type { SecurityFinding } from '../scanner/types';
import SecuritySeverityTag from './SecuritySeverityTag.vue';

defineOptions({ name: 'SecurityFindingCard' });

const props = defineProps<{
	finding: SecurityFinding;
	isAiAvailable: boolean;
}>();

const emit = defineEmits<{
	navigate: [nodeName: string];
	fixWithAi: [finding: SecurityFinding];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const isRemediationOpen = ref(false);

const resolvedNodeType = computed(() => {
	if (!props.finding.nodeType) return null;
	return nodeTypesStore.getNodeType(props.finding.nodeType);
});

function onCardClick() {
	emit('navigate', props.finding.nodeName);
}

function onFixWithAi() {
	emit('fixWithAi', props.finding);
}
</script>

<template>
	<div
		:class="$style.card"
		data-test-id="security-finding-card"
		role="button"
		tabindex="0"
		@click="onCardClick"
		@keydown.enter="onCardClick"
	>
		<div :class="$style.header">
			<N8nText tag="span" size="small" bold :class="$style.title">
				{{ finding.title }}
			</N8nText>
			<SecuritySeverityTag :severity="finding.severity" />
		</div>

		<N8nText tag="p" size="small" color="text-base" :class="$style.description">
			{{ finding.description }}
		</N8nText>

		<div :class="$style.meta">
			<N8nTooltip
				:content="i18n.baseText('securityScanner.finding.nodeTooltip' as BaseTextKey)"
				placement="top"
				:show-after="300"
			>
				<div :class="$style.metaRow">
					<NodeIcon
						v-if="resolvedNodeType"
						:node-type="resolvedNodeType"
						:size="16"
					/>
					<N8nIcon v-else icon="box" size="small" :class="$style.metaIcon" />
					<N8nText tag="span" size="small" bold :class="$style.nodeName">
						{{ finding.nodeName }}
					</N8nText>
				</div>
			</N8nTooltip>
			<N8nTooltip
				v-if="finding.parameterPath"
				:content="i18n.baseText('securityScanner.finding.parameterTooltip' as BaseTextKey)"
				placement="top"
				:show-after="300"
			>
				<div :class="$style.metaRow">
					<N8nIcon icon="code" size="small" :class="$style.metaIcon" />
					<N8nText tag="span" size="small" color="text-light" :class="$style.paramPath">
						{{ finding.parameterPath }}
					</N8nText>
				</div>
			</N8nTooltip>
		</div>

		<N8nText
			v-if="finding.matchedValue"
			tag="code"
			size="small"
			color="text-light"
			:class="$style.matchedValue"
		>
			{{ finding.matchedValue }}
		</N8nText>

		<div :class="$style.actions" @click.stop>
			<N8nLink
				size="small"
				:class="$style.actionLink"
				data-test-id="security-finding-remediation-toggle"
				@click="isRemediationOpen = !isRemediationOpen"
			>
				{{ i18n.baseText('securityScanner.finding.fixManually' as BaseTextKey) }}
			</N8nLink>
			<span v-if="isAiAvailable" :class="$style.actionDivider">|</span>
			<N8nLink
				v-if="isAiAvailable"
				size="small"
				:class="$style.actionLink"
				data-test-id="security-finding-fix-ai"
				@click="onFixWithAi"
			>
				{{ i18n.baseText('securityScanner.finding.fixWithAi' as BaseTextKey) }}
			</N8nLink>
		</div>

		<N8nText
			v-if="isRemediationOpen"
			tag="p"
			size="small"
			color="text-light"
			:class="$style.remediation"
			data-test-id="security-finding-remediation"
			@click.stop
		>
			{{ finding.remediation }}
		</N8nText>
	</div>
</template>

<style module>
.card {
	padding: var(--spacing--xs) 0;
	border-bottom: 1px solid light-dark(var(--color--neutral-200), var(--color--neutral-800));
	color: light-dark(var(--color--neutral-800), var(--color--text));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	cursor: pointer;
	padding-right: var(--spacing--sm);
}

.card:hover {
	background-color: light-dark(var(--color--neutral-50), var(--color--neutral-900));
}

.card:last-child {
	border-bottom: none;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.title {
	flex: 1;
	min-width: 0;
}

.description {
	margin: 0;
	line-height: var(--line-height--xl);
}

.meta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: var(--spacing--4xs) 0;
}

.metaRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.metaIcon {
	color: light-dark(var(--color--neutral-500), var(--color--neutral-400));
	flex-shrink: 0;
}

.nodeName {
	color: light-dark(var(--color--neutral-700), var(--color--neutral-300));
}

.paramPath {
	font-family: monospace;
	font-size: var(--font-size--2xs);
}

.matchedValue {
	display: block;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-900));
	border-radius: var(--radius--sm);
	font-family: monospace;
	font-size: var(--font-size--2xs);
	word-break: break-all;
	color: light-dark(var(--color--neutral-700), var(--color--text--tint-1));
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--4xs);
}

.actionLink {
	font-size: var(--font-size--2xs);
}

.actionDivider {
	color: light-dark(var(--color--neutral-300), var(--color--neutral-600));
	font-size: var(--font-size--2xs);
}

.remediation {
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: light-dark(var(--color--neutral-100), var(--color--neutral-900));
	border-radius: var(--radius);
	line-height: var(--line-height--xl);
	white-space: pre-line;
	color: light-dark(var(--color--neutral-700), var(--color--text--tint-1));
}
</style>
