<script setup lang="ts">
import { computed } from 'vue';
import type { DocPageProperties, DocPageTrigger } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import DocCopyButton from './DocCopyButton.vue';
import DocMethodChips from './DocMethodChips.vue';
import { formatScheduleRule } from '../docPages.properties';

const props = defineProps<{ properties: DocPageProperties }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const agent = computed(() => props.properties.agent);
const hasRows = computed(
	() =>
		props.properties.triggers.length > 0 ||
		!!agent.value?.model ||
		(agent.value?.channels.length ?? 0) > 0,
);

const nodeTypeOf = (trigger: DocPageTrigger) =>
	nodeTypesStore.getNodeType(trigger.nodeType, trigger.typeVersion);
</script>

<template>
	<dl
		v-if="hasRows"
		:class="$style.properties"
		:aria-label="i18n.baseText('docPages.properties.label')"
		data-testid="doc-properties"
	>
		<template v-for="(trigger, index) in properties.triggers" :key="`${trigger.nodeName}-${index}`">
			<template v-if="trigger.type === 'webhook'">
				<div :class="$style.row" data-testid="doc-property-endpoint">
					<dt :class="$style.label">
						<N8nIcon icon="webhook" size="small" />
						{{ i18n.baseText('docPages.properties.endpoint') }}
					</dt>
					<dd :class="$style.value">
						<DocMethodChips :methods="trigger.methods" />
						<span :class="$style.mono">{{ trigger.url }}</span>
						<DocCopyButton :value="trigger.url" :class="$style.copy" />
					</dd>
				</div>
				<div :class="$style.row" data-testid="doc-property-auth">
					<dt :class="$style.label">
						<N8nIcon icon="shield" size="small" />
						{{ i18n.baseText('docPages.properties.authentication') }}
					</dt>
					<dd :class="$style.value">
						{{ i18n.baseText(`docPages.properties.auth.${trigger.auth}`) }}
					</dd>
				</div>
			</template>
			<div v-else-if="trigger.type === 'form'" :class="$style.row" data-testid="doc-property-form">
				<dt :class="$style.label">
					<N8nIcon icon="form" size="small" />
					{{ i18n.baseText('docPages.properties.formUrl') }}
				</dt>
				<dd :class="$style.value">
					<span :class="$style.mono">{{ trigger.url }}</span>
					<DocCopyButton :value="trigger.url" :class="$style.copy" />
				</dd>
			</div>
			<div v-else-if="trigger.type === 'chat'" :class="$style.row" data-testid="doc-property-chat">
				<dt :class="$style.label">
					<N8nIcon icon="message-circle" size="small" />
					{{ i18n.baseText('docPages.properties.chatUrl') }}
				</dt>
				<dd :class="$style.value">
					<template v-if="trigger.url">
						<span :class="$style.mono">{{ trigger.url }}</span>
						<DocCopyButton :value="trigger.url" :class="$style.copy" />
					</template>
					<template v-else>{{ i18n.baseText('docPages.properties.private') }}</template>
				</dd>
			</div>
			<div
				v-else-if="trigger.type === 'schedule'"
				:class="$style.row"
				data-testid="doc-property-schedule"
			>
				<dt :class="$style.label">
					<N8nIcon icon="clock" size="small" />
					{{ i18n.baseText('docPages.properties.schedule') }}
				</dt>
				<dd :class="[$style.value, $style.lines]">
					<span v-for="(rule, ruleIndex) in trigger.rules" :key="ruleIndex">
						{{ formatScheduleRule(rule) }}
					</span>
				</dd>
			</div>
			<div v-else :class="$style.row" data-testid="doc-property-trigger">
				<dt :class="$style.label">
					<N8nIcon icon="zap" size="small" />
					{{ i18n.baseText('docPages.properties.trigger') }}
				</dt>
				<dd :class="$style.value">
					<NodeIcon :node-type="nodeTypeOf(trigger)" :node-name="trigger.nodeName" :size="16" />
					{{ nodeTypeOf(trigger)?.displayName ?? trigger.nodeName }}
				</dd>
			</div>
		</template>
		<div v-if="agent?.model" :class="$style.row" data-testid="doc-property-model">
			<dt :class="$style.label">
				<N8nIcon icon="brain" size="small" />
				{{ i18n.baseText('docPages.properties.model') }}
			</dt>
			<dd :class="[$style.value, $style.mono]">{{ agent.model }}</dd>
		</div>
		<div v-if="agent?.channels.length" :class="$style.row" data-testid="doc-property-channels">
			<dt :class="$style.label">
				<N8nIcon icon="plug" size="small" />
				{{ i18n.baseText('docPages.properties.channels') }}
			</dt>
			<dd :class="$style.value">
				<span v-for="channel in agent.channels" :key="channel" :class="$style.chip">
					{{ channel }}
				</span>
			</dd>
		</div>
	</dl>
</template>

<style lang="scss" module>
.properties {
	display: flex;
	flex-direction: column;
	margin: 0;
}

// A Notion-like property row: a fixed label column and a value column.
.row {
	display: grid;
	grid-template-columns: 10rem minmax(0, 1fr);
	align-items: start;
	gap: var(--spacing--xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius--xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background: var(--background--hover);
	}

	&:hover .copy,
	&:focus-within .copy {
		opacity: 1;
	}
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: var(--height--xs);
	color: var(--text-color--subtle);
}

.value {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	min-height: var(--height--xs);
	margin: 0;
	color: var(--text-color);
}

.lines {
	flex-direction: column;
	align-items: flex-start;
}

.mono {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}

.copy {
	transition: opacity var(--duration--snappy) var(--easing--ease-out);

	// Touch screens have no hover, so the button stays visible there.
	@media (hover: hover) {
		opacity: 0;
	}
}

.chip {
	padding-inline: var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

@media (prefers-reduced-motion: reduce) {
	.row,
	.copy {
		transition: none;
	}
}
</style>
