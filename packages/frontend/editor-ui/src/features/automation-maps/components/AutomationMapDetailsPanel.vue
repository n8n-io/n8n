<script setup lang="ts">
import type {
	AutomationMapAnnotations,
	AutomationMapChange,
	AutomationMapEdge,
	AutomationMapGraph,
} from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { MapSelection } from '../automationMap.types';

const props = defineProps<{
	graph: AutomationMapGraph;
	annotations: AutomationMapAnnotations | null;
	changes: AutomationMapChange[];
	selection: MapSelection;
}>();

const emit = defineEmits<{
	select: [selection: MapSelection];
	close: [];
}>();

const i18n = useI18n();
const router = useRouter();
const nodeTypesStore = useNodeTypesStore();

interface LinkedItem {
	key: string;
	selection: MapSelection;
	label: string;
	detail: string;
	icon: 'workflow' | 'table' | 'globe';
	nodeType: string | null;
}

const nodeId = computed(() => {
	if (props.selection.kind === 'workflow') return `wf:${props.selection.id}`;
	if (props.selection.kind === 'dataTable') return `dt:${props.selection.id}`;
	return `svc:${props.selection.id}`;
});

const workflow = computed(() =>
	props.selection.kind === 'workflow'
		? props.graph.workflows.find((item) => item.id === props.selection.id)
		: undefined,
);
const dataTable = computed(() =>
	props.selection.kind === 'dataTable'
		? props.graph.dataTables.find((item) => item.id === props.selection.id)
		: undefined,
);
const service = computed(() =>
	props.selection.kind === 'service'
		? props.graph.services.find((item) => item.key === props.selection.id)
		: undefined,
);

const change = computed(
	() => props.changes.find((item) => item.workflowId === workflow.value?.id)?.change ?? null,
);

const group = computed(() =>
	workflow.value
		? props.annotations?.groups.find((item) => item.workflowIds.includes(workflow.value?.id ?? ''))
		: undefined,
);

function itemFor(id: string, edge: AutomationMapEdge): LinkedItem | null {
	const nodeNames = edge.nodeNames.length ? edge.nodeNames.join(', ') : '';
	const detail = [
		edge.via ? i18n.baseText('automationMaps.edge.via', { interpolate: { via: edge.via } }) : '',
		nodeNames,
	]
		.filter(Boolean)
		.join(' · ');
	if (id.startsWith('wf:')) {
		const target = props.graph.workflows.find((item) => `wf:${item.id}` === id);
		if (!target) return null;
		return {
			key: `${edge.id}`,
			selection: { kind: 'workflow', id: target.id },
			label: target.name,
			detail,
			icon: 'workflow',
			nodeType: null,
		};
	}
	if (id.startsWith('dt:')) {
		const target = props.graph.dataTables.find((item) => `dt:${item.id}` === id);
		if (!target) return null;
		return {
			key: edge.id,
			selection: { kind: 'dataTable', id: target.id },
			label: target.name,
			detail,
			icon: 'table',
			nodeType: null,
		};
	}
	const target = props.graph.services.find((item) => `svc:${item.key}` === id);
	if (!target) return null;
	return {
		key: edge.id,
		selection: { kind: 'service', id: target.key },
		label: target.name,
		detail,
		icon: 'globe',
		nodeType: target.nodeType,
	};
}

function linked(kinds: Array<AutomationMapEdge['kind']>, direction: 'out' | 'in') {
	return props.graph.edges
		.filter((edge) => kinds.includes(edge.kind))
		.filter((edge) => (direction === 'out' ? edge.source : edge.target) === nodeId.value)
		.map((edge) => itemFor(direction === 'out' ? edge.target : edge.source, edge))
		.filter((item): item is LinkedItem => item !== null);
}

const sections = computed(() => {
	const all = [
		{ title: 'automationMaps.details.calls', items: linked(['calls', 'dispatches'], 'out') },
		{ title: 'automationMaps.details.calledBy', items: linked(['calls', 'dispatches'], 'in') },
		{
			title: 'automationMaps.details.references',
			items: linked(['references', 'errorHandler'], 'out'),
		},
		{
			title: 'automationMaps.details.referencedBy',
			items: linked(['references', 'errorHandler'], 'in'),
		},
		{ title: 'automationMaps.details.reads', items: linked(['reads'], 'in') },
		{ title: 'automationMaps.details.writes', items: linked(['writes'], 'out') },
		{ title: 'automationMaps.details.readBy', items: linked(['reads'], 'out') },
		{ title: 'automationMaps.details.writtenBy', items: linked(['writes'], 'in') },
		{ title: 'automationMaps.details.services', items: linked(['uses'], 'out') },
		{ title: 'automationMaps.details.usedBy', items: linked(['uses'], 'in') },
	] as const;
	return all.filter((section) => section.items.length > 0);
});

const openHref = computed(() => {
	if (workflow.value && !workflow.value.missing) {
		return router.resolve({ path: `/workflow/${workflow.value.id}` }).href;
	}
	if (dataTable.value?.projectId && !dataTable.value.missing) {
		return router.resolve({
			path: `/projects/${dataTable.value.projectId}/datatables/${dataTable.value.id}`,
		}).href;
	}
	return null;
});

const externalHref = computed(() => (service.value?.host ? `https://${service.value.host}` : null));

function credentialHref(id: string) {
	return router.resolve({ path: `/home/credentials/${id}` }).href;
}

const title = computed(
	() => workflow.value?.name ?? dataTable.value?.name ?? service.value?.name ?? '',
);

const summary = computed(() => {
	if (!workflow.value) return '';
	return props.annotations?.workflowSummaries[workflow.value.id] ?? '';
});
</script>

<template>
	<aside :class="$style.panel" data-test-id="automation-map-details">
		<header :class="$style.header">
			<div :class="$style.headerIcon">
				<NodeIcon
					v-if="service?.nodeType"
					:node-type="nodeTypesStore.getNodeType(service.nodeType)"
					:size="24"
				/>
				<N8nIcon v-else-if="service" icon="globe" :size="20" />
				<N8nIcon v-else-if="dataTable" icon="table" :size="20" />
				<N8nIcon v-else icon="workflow" :size="20" />
			</div>
			<N8nHeading tag="h3" size="medium" bold :class="$style.title">{{ title }}</N8nHeading>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('automationMaps.details.close')"
				@click="emit('close')"
			/>
		</header>

		<div :class="$style.body">
			<div :class="$style.actions">
				<N8nButton
					v-if="openHref"
					:href="openHref"
					target="_blank"
					variant="outline"
					size="small"
					data-test-id="automation-map-open"
				>
					<N8nIcon icon="external-link" :size="12" />
					{{
						workflow
							? i18n.baseText('automationMaps.details.openWorkflow')
							: i18n.baseText('automationMaps.details.openDataTable')
					}}
				</N8nButton>
				<N8nButton
					v-if="externalHref"
					target="_blank"
					:href="externalHref"
					variant="outline"
					size="small"
				>
					<N8nIcon icon="external-link" :size="12" />
					{{ service?.host }}
				</N8nButton>
			</div>

			<template v-if="workflow">
				<div :class="$style.badges">
					<span :class="[$style.badge, workflow.active ? $style.badgeActive : '']">
						{{
							workflow.active
								? i18n.baseText('automationMaps.workflow.active')
								: i18n.baseText('automationMaps.workflow.inactive')
						}}
					</span>
					<span v-if="group" :class="$style.badge">{{ group.name }}</span>
					<span v-if="change" :class="[$style.badge, $style.badgeChange]">
						{{ i18n.baseText(`automationMaps.change.${change}`) }}
					</span>
				</div>
				<N8nText v-if="summary" tag="p" size="small" :class="$style.paragraph">
					{{ summary }}
				</N8nText>
				<N8nText
					v-if="workflow.description && workflow.description !== summary"
					tag="p"
					size="small"
					color="text-light"
					:class="$style.paragraph"
				>
					{{ workflow.description }}
				</N8nText>
				<div v-if="workflow.triggers.length" :class="$style.section">
					<N8nText size="xsmall" bold color="text-light" :class="$style.sectionTitle">
						{{ i18n.baseText('automationMaps.details.triggers') }}
					</N8nText>
					<div v-for="trigger in workflow.triggers" :key="trigger.label" :class="$style.item">
						<NodeIcon :node-type="nodeTypesStore.getNodeType(trigger.nodeType)" :size="16" />
						<N8nText size="small">{{ trigger.label }}</N8nText>
					</div>
				</div>
				<N8nText
					v-if="workflow.hasUnresolvedDynamicCall"
					tag="p"
					size="small"
					color="warning"
					:class="$style.paragraph"
				>
					{{ i18n.baseText('automationMaps.workflow.dynamicCall') }}
				</N8nText>
				<N8nText v-if="workflow.folderPath" size="xsmall" color="text-light">
					<N8nIcon icon="folder" :size="12" /> {{ workflow.folderPath }}
				</N8nText>
			</template>

			<div v-if="service?.credentials.length" :class="$style.section">
				<N8nText size="xsmall" bold color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText('automationMaps.details.credentials') }}
				</N8nText>
				<a
					v-for="credential in service.credentials"
					:key="credential.id"
					:href="credentialHref(credential.id)"
					target="_blank"
					:class="[$style.item, $style.link]"
				>
					<N8nIcon icon="key-round" :size="14" />
					<N8nText size="small">{{ credential.name }}</N8nText>
				</a>
			</div>

			<div v-for="section in sections" :key="section.title" :class="$style.section">
				<N8nText size="xsmall" bold color="text-light" :class="$style.sectionTitle">
					{{ i18n.baseText(section.title) }} ({{ section.items.length }})
				</N8nText>
				<button
					v-for="item in section.items"
					:key="item.key"
					type="button"
					:class="[$style.item, $style.link]"
					@click="emit('select', item.selection)"
				>
					<NodeIcon
						v-if="item.nodeType"
						:node-type="nodeTypesStore.getNodeType(item.nodeType)"
						:size="14"
					/>
					<N8nIcon v-else :icon="item.icon" :size="14" />
					<span :class="$style.itemText">
						<N8nText size="small">{{ item.label }}</N8nText>
						<N8nText v-if="item.detail" size="xsmall" color="text-light">{{ item.detail }}</N8nText>
					</span>
				</button>
			</div>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	width: 360px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-3);
	border-left: var(--border);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}

.headerIcon {
	display: flex;
	color: var(--color--text--tint-1);
}

.title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.actions,
.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.badge {
	font-size: var(--font-size--3xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--xl);
	background: var(--color--foreground--tint-1);
	color: var(--color--text);
}

.badgeActive {
	background: var(--color--success--tint-3);
	color: var(--color--success--shade-1);
}

.badgeChange {
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
}

.paragraph {
	margin: 0;
	line-height: var(--line-height--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.sectionTitle {
	text-transform: uppercase;
	letter-spacing: 0.04em;
	margin-bottom: var(--spacing--4xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	text-align: left;
	background: none;
	border: none;
	color: var(--color--text);
	text-decoration: none;
}

.link {
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.itemText {
	display: flex;
	flex-direction: column;
	min-width: 0;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}
</style>
