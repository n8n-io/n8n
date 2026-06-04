<script setup lang="ts">
// PROTOTYPE VARIANT V3 — turns the collapsed group card into a control surface:
// title + description, a compact services icon row (click a node to open it),
// and a few editable "key parameters". Content is curated in v3Config.ts.
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';

import type { GroupCardProps, GroupCardEmits } from './types';
import { GROUP_V3_CONFIG } from './v3Config';
import GroupServiceIcons from './GroupServiceIcons.vue';
import GroupParamRow from './GroupParamRow.vue';

const props = defineProps<GroupCardProps>();
const emit = defineEmits<GroupCardEmits>();

const i18n = useI18n();

// PROTOTYPE section labels (kept as constants so they're not flagged as raw text).
const servicesLabel = 'Services';
const parametersLabel = 'Parameters';

const config = computed(() => GROUP_V3_CONFIG[props.title]);

const nodeIdByName = computed<Record<string, string>>(() =>
	Object.fromEntries(props.memberNodes.map((node) => [node.name, node.id])),
);

const services = computed(() => {
	const cfg = config.value;
	if (!cfg) return [];
	const nameToId = new Map(props.memberNodes.map((node) => [node.name, node.id]));
	return cfg.services
		.map((service) => {
			const nodes = service.nodeNames
				.filter((name) => nameToId.has(name))
				.map((name) => {
					const id = nameToId.get(name) as string;
					return { id, name, iconSource: props.iconSourceForNodeId(id) };
				});
			return { label: service.label, iconSource: nodes[0]?.iconSource, nodes };
		})
		.filter((service) => service.nodes.length > 0);
});

const parameters = computed(() => config.value?.parameters ?? []);
</script>

<template>
	<div :class="$style.body">
		<N8nIconButton
			v-if="!isReadOnly"
			:class="$style.expandToggle"
			variant="ghost"
			icon="chevrons-up-down"
			:aria-label="i18n.baseText('canvas.nodeGroup.expand')"
			data-test-id="canvas-collapsed-group-expand"
			@click.stop="emit('expand')"
			@mousedown.stop
		/>
		<div :class="$style.content">
			<span :class="$style.title" data-test-id="canvas-collapsed-group-title">{{ title }}</span>
			<p v-if="description" :class="$style.description">{{ description }}</p>

			<div v-if="services.length" :class="$style.serviceRow">
				<span :class="$style.sectionLabel">{{ servicesLabel }}</span>
				<GroupServiceIcons
					:services="services"
					@open-node="(name: string) => emit('open-node', name)"
				/>
			</div>

			<div v-if="parameters.length" :class="$style.params">
				<span :class="$style.sectionLabel">{{ parametersLabel }}</span>
				<GroupParamRow
					v-for="param in parameters"
					:key="param.id"
					:param="param"
					:group-id="groupId"
					:node-id-by-name="nodeIdByName"
					:is-read-only="isReadOnly"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.body {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
}

.expandToggle {
	flex-shrink: 0;
}

// Title, description, services and parameters all share this left edge so they
// line up beneath each other (to the right of the expand chevron).
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.title {
	min-width: 0;

	white-space: nowrap;
}

.description {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--md);
	color: var(--color--text--tint-1);
	overflow-wrap: anywhere;
}

.sectionLabel {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color--text--tint-1);
}

.serviceRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.params {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--2xs);
}

.params .sectionLabel {
	margin-bottom: var(--spacing--3xs);
}
</style>
