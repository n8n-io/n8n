<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { N8nButton, N8nHeading } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import type { INode, INodeParameters } from 'n8n-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import ParameterInputList from '@/features/ndv/parameters/components/ParameterInputList.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { collectParametersByTab } from '@/features/ndv/shared/ndv.utils';
import type { IUpdateInformation } from '@/Interface';

const props = defineProps<{
	modalName: string;
	data: {
		node: INode | null;
		onConfirm: (configuredNode: INode) => void;
	};
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const modalBus = ref(createEventBus());
const nodeName = ref(props.data.node?.name ?? '');
const parameterValues = ref<INodeParameters>();

const nodeTypeDescription = computed(() => {
	if (!props.data.node) {
		return null;
	}
	return nodeTypesStore.getNodeType(props.data.node.type);
});
const parameters = computed(
	() => collectParametersByTab(nodeTypeDescription.value?.properties ?? [], false).params,
);

function onConfirm() {
	if (!props.data.node || !parameterValues.value) {
		return;
	}

	const configuredNode: INode = {
		...props.data.node,
		name: nodeName.value,
		parameters: parameterValues.value,
	};

	props.data.onConfirm(configuredNode);
	modalBus.value.emit('close');
}

function onCancel() {
	modalBus.value.emit('close');
}

function parameterValueChanged(updateData: IUpdateInformation) {
	parameterValues.value = {
		...parameterValues.value,
		[updateData.name]: updateData.value,
	};
}

watch(
	() => props.data.node,
	(initialNode) => {
		if (initialNode) {
			nodeName.value = initialNode.name;
			parameterValues.value = initialNode.parameters;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<Modal
		v-if="data.node && parameterValues"
		:name="modalName"
		:event-bus="modalBus"
		width="50%"
		:center="true"
		max-width="460px"
		min-height="250px"
	>
		<template #header>
			<div :class="$style.header">
				<NodeIcon
					v-if="nodeTypeDescription"
					:node-type="nodeTypeDescription"
					:size="24"
					:circle="true"
					:class="$style.icon"
				/>
				<N8nHeading size="medium" tag="h2" :class="$style.title">
					{{ i18n.baseText('chatHub.toolSettings.title') }}
				</N8nHeading>
			</div>
		</template>
		<template #content>
			<ParameterInputList
				:parameters="parameters"
				:hide-delete="true"
				:node-values="parameterValues"
				:is-read-only="false"
				path="parameters"
				:node="data.node"
				@value-changed="parameterValueChanged"
			>
				<NodeCredentials
					:node="data.node"
					:readonly="false"
					:show-all="true"
					:hide-issues="false"
					@value-changed="parameterValueChanged"
				/>
			</ParameterInputList>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="tertiary" @click="onCancel">
					{{ i18n.baseText('chatHub.toolSettings.cancel') }}
				</N8nButton>
				<N8nButton type="primary" :disabled="!nodeName" @click="onConfirm">
					{{ i18n.baseText('chatHub.toolSettings.confirm') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
}

.footer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}

.formGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
