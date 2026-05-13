<script lang="ts" setup>
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { HubActionExecutionPayload } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	hubActionExecution: HubActionExecutionPayload;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => nodeTypesStore.getNodeType(props.hubActionExecution.nodeType));

const title = computed(() => {
	const { nodeDisplayName, operationDisplayName, actionDisplayName } = props.hubActionExecution;
	if (operationDisplayName) {
		return `${nodeDisplayName} — ${operationDisplayName}`;
	}
	return actionDisplayName;
});

const parameters = computed(() => props.hubActionExecution.parameters);
const credential = computed(() => props.hubActionExecution.credential);
</script>

<template>
	<div :class="$style.card" data-test-id="hub-action-approval-card">
		<div :class="$style.header">
			<div :class="$style.iconSlot">
				<NodeIcon
					v-if="nodeType"
					:node-type="nodeType"
					:size="24"
					:node-name="hubActionExecution.nodeDisplayName"
				/>
				<div v-else :class="$style.iconFallback" aria-hidden="true">
					{{ hubActionExecution.nodeDisplayName.slice(0, 1).toUpperCase() }}
				</div>
			</div>
			<div :class="$style.titleStack">
				<N8nText :class="$style.title" tag="div" size="medium" bold>
					{{ title }}
				</N8nText>
				<div v-if="credential" :class="$style.credentialLine">
					<N8nText tag="span" size="small" color="text-light">
						{{ i18n.baseText('instanceAi.hubActionApproval.with') }}
					</N8nText>
					<a
						:class="$style.credentialLink"
						:href="`/home/credentials/${credential.id}`"
						target="_blank"
						rel="noopener noreferrer"
						:title="credential.name"
						data-test-id="hub-action-approval-credential-link"
					>
						<N8nIcon :class="$style.credentialIcon" icon="key-round" size="xsmall" />
						<span>{{ credential.name }}</span>
					</a>
				</div>
			</div>
		</div>

		<dl
			v-if="parameters.length > 0"
			:class="$style.params"
			data-test-id="hub-action-approval-params"
		>
			<template v-for="entry in parameters" :key="entry.label">
				<dt :class="$style.paramLabel">
					{{ entry.label }}<span :class="$style.paramSeparator">:</span>
				</dt>
				<dd :class="$style.paramValue" :title="entry.value">{{ entry.value }}</dd>
			</template>
		</dl>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.iconSlot {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
}

.iconFallback {
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--background--shade-1);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.titleStack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.title {
	line-height: var(--line-height--md);
	word-break: break-word;
}

.credentialLine {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-wrap: wrap;
}

.credentialLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	color: var(--color--primary);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--regular);
	text-decoration: none;
	border-radius: var(--radius);
	padding: 0 var(--spacing--5xs);
	margin: 0 calc(var(--spacing--5xs) * -1);

	&:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.credentialIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.params {
	display: grid;
	grid-template-columns: max-content minmax(0, 1fr);
	column-gap: var(--spacing--sm);
	row-gap: var(--spacing--5xs);
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: light-dark(var(--color--background), var(--color--neutral-850));
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	color: var(--color--text);
}

.paramLabel {
	margin: 0;
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--regular);
	white-space: nowrap;
}

.paramSeparator {
	color: var(--color--text--tint-2);
	margin-left: 1px;
}

.paramValue {
	margin: 0;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color--text);
	font-weight: var(--font-weight--medium);
}
</style>
