<script setup lang="ts">
import { useActions } from '@/components/Node/NodeCreator/composables/useActions';
import { useActionsGenerator } from '@/components/Node/NodeCreator/composables/useActionsGeneration';
import { CUSTOM_API_CALL_KEY } from '@/constants';
import type { ActionCreateElement, INodeCreateElement, INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import { type INodeParameters } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';

import { N8nIcon, N8nText } from '@n8n/design-system';
const { node } = defineProps<{
	node: INodeUi;
}>();

const emit = defineEmits<{
	actionSelected: [INodeParameters];
}>();

const nodeTypesStore = useNodeTypesStore();
const { generateMergedNodesAndActions } = useActionsGenerator();
const { parseCategoryActions, getActionData } = useActions();
const i18n = useI18n();

const selectedActionRef = ref<HTMLElement>();

const nodeType = computed(() => nodeTypesStore.getNodeType(node.type, node.typeVersion));
const options = computed(() => {
	const { actions } = generateMergedNodesAndActions(nodeType.value ? [nodeType.value] : [], []);

	return parseCategoryActions(
		Object.values(actions).flatMap((typeDescriptions) =>
			typeDescriptions
				.filter(({ actionKey }) => actionKey !== CUSTOM_API_CALL_KEY)
				.map<ActionCreateElement>((typeDescription) => ({
					type: 'action',
					subcategory: typeDescription.actionKey,
					key: typeDescription.actionKey,
					properties: typeDescription,
				})),
		),
		i18n.baseText('nodeCreator.actionsCategory.actions'),
		true,
	).map((action) => {
		if (action.type !== 'action') {
			return { action, isSelected: false };
		}

		const data = getActionData(action.properties).value;
		let isSelected = true;

		for (const [key, value] of Object.entries(data)) {
			isSelected = isSelected && node.parameters[key] === value;
		}

		return { action, isSelected };
	});
});

function handleClickOption(option: INodeCreateElement) {
	if (option.type !== 'action') {
		return;
	}

	emit('actionSelected', getActionData(option.properties).value);
}

function handleSelectedItemRef(el: unknown) {
	if (el instanceof HTMLDivElement) {
		selectedActionRef.value = el;
	}
}

watch(
	selectedActionRef,
	(selected) => {
		selected?.scrollIntoView();
	},
	{ flush: 'post' },
);
</script>

<template>
	<div :class="$style.component">
		<template v-for="option in options" :key="option.action.key">
			<N8nText
				v-if="option.action.type === 'label'"
				tag="div"
				:class="$style.label"
				size="xsmall"
				color="text-base"
				bold
			>
				{{ option.action.key }}
			</N8nText>
			<div
				v-else-if="option.action.type === 'action'"
				:ref="option.isSelected ? handleSelectedItemRef : undefined"
				:class="{
					[$style.option]: true,
					[$style.selected]: option.isSelected,
				}"
				role="button"
				@click="handleClickOption(option.action)"
			>
				<NodeIcon :size="20" :node-type="nodeType" />
				<N8nText size="small" bold :class="$style.optionText">{{
					option.action.properties.displayName
				}}</N8nText>
				<N8nIcon v-if="option.isSelected" icon="check" color="primary" />
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.component {
	padding-block: var(--spacing--2xs);
}

.label {
	padding: var(--spacing--3xs) var(--spacing--sm);
	text-transform: uppercase;
}

.option {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs) var(--spacing--sm);
	gap: var(--spacing--2xs);
	cursor: pointer;

	&.selected,
	&:hover {
		background-color: var(--color--background);
	}
}

.optionText {
	flex-grow: 1;
	flex-shrink: 1;
}
</style>
