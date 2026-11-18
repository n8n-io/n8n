<script setup lang="ts">
import { computed } from 'vue';
import type { DocPageProperties } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import DocMethodChips from './DocMethodChips.vue';
import { formatScheduleRule, primaryTrigger, urlPath } from '../docPages.properties';

const props = defineProps<{ properties: DocPageProperties | null }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const agent = computed(() => props.properties?.agent ?? null);
const trigger = computed(() => primaryTrigger(props.properties));
const nodeType = computed(() =>
	trigger.value
		? nodeTypesStore.getNodeType(trigger.value.nodeType, trigger.value.typeVersion)
		: null,
);
</script>

<template>
	<span v-if="agent" :class="$style.line" data-testid="doc-property-line">
		<N8nIcon icon="bot" size="small" :class="$style.icon" />
		<span v-if="agent.model" :class="[$style.mono, $style.truncate]">{{ agent.model }}</span>
		<span v-for="channel in agent.channels" :key="channel" :class="$style.chip">
			{{ channel }}
		</span>
	</span>
	<span v-else-if="trigger" :class="$style.line" data-testid="doc-property-line">
		<template v-if="trigger.type === 'webhook'">
			<DocMethodChips :methods="trigger.methods" />
			<span :class="[$style.mono, $style.truncate]">{{ urlPath(trigger.url) }}</span>
			<span
				v-if="trigger.auth !== 'none'"
				:class="[$style.chip, $style.auth]"
				:title="
					i18n.baseText('docPages.properties.authRequired', {
						interpolate: { auth: i18n.baseText(`docPages.properties.auth.${trigger.auth}`) },
					})
				"
				data-testid="doc-property-lock"
			>
				<N8nIcon icon="lock" size="xsmall" />
				{{ i18n.baseText(`docPages.properties.auth.${trigger.auth}`) }}
			</span>
		</template>
		<template v-else-if="trigger.type === 'form'">
			<N8nIcon icon="form" size="small" :class="$style.icon" />
			{{ i18n.baseText('docPages.properties.form') }}
			<span :class="[$style.mono, $style.truncate]">{{ urlPath(trigger.url) }}</span>
		</template>
		<template v-else-if="trigger.type === 'chat'">
			<N8nIcon icon="message-circle" size="small" :class="$style.icon" />
			{{ i18n.baseText('docPages.properties.chat') }}
			<span :class="$style.chip">
				{{
					trigger.url
						? i18n.baseText('docPages.properties.public')
						: i18n.baseText('docPages.properties.private')
				}}
			</span>
		</template>
		<template v-else-if="trigger.type === 'schedule' && trigger.rules.length > 0">
			<N8nIcon icon="clock" size="small" :class="$style.icon" />
			<span :class="$style.truncate">{{ formatScheduleRule(trigger.rules[0]) }}</span>
			<span v-if="trigger.rules.length > 1" :class="$style.chip">
				{{
					i18n.baseText('docPages.properties.more', {
						interpolate: { count: trigger.rules.length - 1 },
					})
				}}
			</span>
		</template>
		<template v-else-if="trigger.type === 'event'">
			<NodeIcon :node-type="nodeType" :node-name="trigger.nodeName" :size="14" />
			<span :class="$style.truncate">{{ nodeType?.displayName ?? trigger.nodeName }}</span>
		</template>
	</span>
</template>

<style lang="scss" module>
.line {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	color: var(--text-color--subtle);
	font-size: var(--doc-property-line--font-size, var(--font-size--2xs));
	line-height: var(--line-height--xl);
	white-space: nowrap;
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.mono {
	font-family: var(--font-family--monospace);
}

.truncate {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
	padding-inline: var(--spacing--4xs);
	border-radius: var(--radius--2xs);
	background: var(--background--hover);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
}
.auth {
	color: var(--text-color);
}
</style>
