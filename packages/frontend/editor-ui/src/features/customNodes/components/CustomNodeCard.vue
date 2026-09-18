<script lang="ts" setup>
import { computed } from 'vue';
import type { CustomNodeListItem } from '@n8n/api-types';
import type { IUser } from 'n8n-workflow';
import type { UserAction } from '@n8n/design-system';
import { N8nActionToggle, N8nBadge, N8nCard, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

const props = defineProps<{ item: CustomNodeListItem }>();

const emit = defineEmits<{
	edit: [item: CustomNodeListItem];
	versions: [item: CustomNodeListItem];
	replaceLogo: [item: CustomNodeListItem];
	delete: [item: CustomNodeListItem];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => nodeTypesStore.getNodeType(props.item.nodeType));

const parentNodeType = computed(() =>
	props.item.kind === 'operation' && props.item.definition.parentNodeType
		? nodeTypesStore.getNodeType(props.item.definition.parentNodeType)
		: null,
);

const subtitle = computed(() => {
	if (props.item.kind === 'node') {
		return i18n.baseText('settings.customNodes.card.operations', {
			interpolate: { count: String(props.item.operations.length) },
		});
	}
	return i18n.baseText('settings.customNodes.card.parent', {
		interpolate: { node: parentNodeType.value?.displayName ?? props.item.definition.parentNodeType ?? '' },
	});
});

const versionInfo = computed(() => {
	if (props.item.kind !== 'operation') return null;
	const { activeVersion, versions } = props.item.definition;
	return {
		active: i18n.baseText('settings.customNodes.card.activeVersion', {
			interpolate: { version: String(activeVersion) },
		}),
		count: i18n.baseText('settings.customNodes.card.versions', {
			interpolate: { count: String(versions.length) },
		}),
	};
});

const actions = computed<Array<UserAction<IUser>>>(() => {
	const list: Array<UserAction<IUser>> = [];
	if (props.item.kind === 'operation') {
		list.push(
			{ label: i18n.baseText('settings.customNodes.actions.edit'), value: 'edit' },
			{ label: i18n.baseText('settings.customNodes.actions.versions'), value: 'versions' },
		);
	} else {
		list.push({ label: i18n.baseText('settings.customNodes.actions.replaceLogo'), value: 'logo' });
	}
	list.push({ label: i18n.baseText('settings.customNodes.actions.delete'), value: 'delete' });
	return list;
});

function onAction(value: string) {
	if (value === 'edit') emit('edit', props.item);
	if (value === 'versions') emit('versions', props.item);
	if (value === 'logo') emit('replaceLogo', props.item);
	if (value === 'delete') emit('delete', props.item);
}
</script>

<template>
	<N8nCard :class="$style.card" data-test-id="custom-node-card">
		<div :class="$style.row">
			<NodeIcon :node-type="nodeType ?? parentNodeType" :size="32" />
			<div :class="$style.body">
				<div :class="$style.titleRow">
					<N8nText bold>{{ item.name }}</N8nText>
					<N8nBadge v-if="item.kind === 'node'" theme="tertiary" size="small">
						{{ i18n.baseText('settings.customNodes.section.nodes') }}
					</N8nBadge>
					<N8nBadge v-else theme="primary" size="small">
						{{ i18n.baseText('settings.customNodes.section.operations') }}
					</N8nBadge>
				</div>
				<N8nText size="small" color="text-light">{{ subtitle }}</N8nText>
				<div v-if="versionInfo" :class="$style.versionRow">
					<N8nBadge theme="success" size="small">{{ versionInfo.active }}</N8nBadge>
					<N8nText size="xsmall" color="text-light">{{ versionInfo.count }}</N8nText>
				</div>
				<div v-if="item.kind === 'node'" :class="$style.operations">
					<N8nText
						v-for="operation in item.operations"
						:key="operation.id"
						size="xsmall"
						color="text-light"
					>
						· {{ operation.name }} (v{{ operation.activeVersion }})
					</N8nText>
				</div>
			</div>
			<N8nActionToggle
				:actions="actions"
				theme="dark"
				data-test-id="custom-node-card-actions"
				@action="onAction"
			/>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	margin-bottom: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.body {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.titleRow,
.versionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.operations {
	display: flex;
	flex-direction: column;
}
</style>
