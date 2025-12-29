<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { computed, onMounted, ref } from 'vue';
import { type DropdownMenuItemProps, N8nButton, N8nDropdownMenu } from '@n8n/design-system';
import { NodeConnectionTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import NodeCreator from '@/features/shared/nodeCreator/components/NodeCreator.vue';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { AI_UNCATEGORIZED_CATEGORY } from '@/app/constants';
import type { NodeTypeSelectedPayload } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import { TOOL_SETTINGS_MODAL_KEY } from '@/features/ai/chatHub/constants';

const {
	selected,
	transparentBg = false,
	disabledTooltip,
} = defineProps<{
	disabled: boolean;
	selected: INode[];
	transparentBg?: boolean;
	disabledTooltip?: string;
}>();

const emit = defineEmits<{
	change: [tools: INode[]];
}>();

const nodeCreatorStore = useNodeCreatorStore();
const bannersStore = useBannersStore();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const i18n = useI18n();

const toolCount = computed(() => selected.length);

const displayToolNodeTypes = computed(() => {
	return selected
		.slice(0, 3)
		.map((t) => nodeTypesStore.getNodeType(t.type))
		.filter(Boolean);
});

const toolsLabel = computed(() => {
	if (toolCount.value > 0) {
		return i18n.baseText('chatHub.tools.selector.label.count', { adjustToNumber: toolCount.value });
	}
	return i18n.baseText('chatHub.tools.selector.label.default');
});

const nodeCreatorInlineStyle = computed(() => {
	return {
		top: `${bannersStore.bannersHeight}px`,
		right: '0',
	};
});

const isNodeCreatorOpen = ref(false);

function toggleNodeCreatorOpen() {
	isNodeCreatorOpen.value = !isNodeCreatorOpen.value;

	nodeCreatorStore.setNodeCreatorState({
		createNodeActive: !nodeCreatorStore.isCreateNodeActive,
		nodeCreatorView: AI_UNCATEGORIZED_CATEGORY,
		connectionType: NodeConnectionTypes.AiTool,
	});
}

function handleSelectNodeType(value: NodeTypeSelectedPayload[]) {
	isNodeCreatorOpen.value = false;

	const nodeType = value[0] ? nodeTypesStore.getNodeType(value[0].type) : undefined;
	const typeVersion =
		typeof nodeType?.version === 'number' ? nodeType.version : nodeType?.version[0];

	if (!nodeType || !typeVersion) {
		return;
	}

	uiStore.openModalWithData({
		name: TOOL_SETTINGS_MODAL_KEY,
		data: {
			node: {
				type: nodeType.name,
				typeVersion,
				parameters: {},
				id: uuidv4(),
				name: nodeType.displayName,
				position: [0, 0],
			},
			onConfirm: (configuredNode: INode) => {
				emit('change', [...selected, configuredNode]);
			},
		},
	});
}

const menuItems = computed<Array<DropdownMenuItemProps<string, INodeTypeDescription>>>(() => [
	...selected.map((sel) => ({
		id: `selected::${sel.id}`,
		label: sel.name,
		checked: true,
		data: nodeTypesStore.getNodeType(sel.type, sel.typeVersion) ?? undefined,
		children: [
			{
				id: `configure::${sel.id}`,
				label: 'Configure',
				icon: { type: 'icon' as const, value: 'settings' as const },
			},
			{
				id: `remove::${sel.id}`,
				label: 'Remove',
				icon: { type: 'icon' as const, value: 'trash-2' as const },
			},
		],
	})),
	{
		id: 'add',
		label: 'Add tool',
		divided: true,
		icon: { type: 'icon', value: 'plus' },
	},
]);

function handleSelect(id: string) {
	const [command, target] = id.split('::');

	if (command === 'add') {
		toggleNodeCreatorOpen();
		return;
	}

	const targetNode = selected.find((sel) => sel.id === target);

	if (!targetNode) {
		return;
	}

	if (command === 'remove') {
		emit(
			'change',
			selected.filter((s) => s.id !== targetNode.id),
		);
	}

	if (command === 'configure') {
		uiStore.openModalWithData({
			name: TOOL_SETTINGS_MODAL_KEY,
			data: {
				node: targetNode,
				onConfirm: (configuredNode: INode) => {
					emit(
						'change',
						selected.map((sel) => (sel.id === targetNode.id ? configuredNode : sel)),
					);
				},
			},
		});
	}
}

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});

/**
 * TODO
 * - tooltip doesn't work well with dropdown
 * - for personal agent, click to open edit modal as before
 */
</script>

<template>
	<div>
		<N8nDropdownMenu
			:items="menuItems"
			placement="bottom-start"
			:disabled="selected.length === 0"
			@select="handleSelect"
		>
			<template #trigger>
				<N8nButton
					type="secondary"
					native-type="button"
					:class="[$style.toolsButton, { [$style.transparentBg]: transparentBg }]"
					:disabled="disabled"
					:icon="toolCount > 0 ? undefined : 'plus'"
					@click="selected.length === 0 ? toggleNodeCreatorOpen() : undefined"
				>
					<span v-if="toolCount" :class="$style.iconStack">
						<NodeIcon
							v-for="(nodeType, i) in displayToolNodeTypes"
							:key="`${nodeType?.name}-${i}`"
							:style="{ zIndex: displayToolNodeTypes.length - i }"
							:node-type="nodeType"
							:class="[$style.icon, { [$style.iconOverlap]: i !== 0 }]"
							:circle="true"
							:size="12"
						/>
					</span>
					{{ toolsLabel }}
				</N8nButton>
			</template>

			<template #item-leading="{ item }">
				<NodeIcon v-if="item.data" :node-type="item.data" :size="16" />
			</template>
		</N8nDropdownMenu>

		<Teleport to="body">
			<NodeCreator
				:active="isNodeCreatorOpen"
				:style="nodeCreatorInlineStyle"
				@close-node-creator="toggleNodeCreatorOpen"
				@node-type-selected="handleSelectNodeType"
			/>
		</Teleport>
	</div>
</template>

<style lang="scss" module>
.toolsButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	&.transparentBg {
		background-color: transparent !important;
	}
}

.iconStack {
	display: flex;
	align-items: center;
	position: relative;
}

.icon {
	padding: var(--spacing--4xs);
	background-color: var(--color--background--light-2);
	border-radius: 50%;
	outline: 2px var(--color--background--light-3) solid;
}

.iconOverlap {
	margin-left: -6px;
}
</style>
