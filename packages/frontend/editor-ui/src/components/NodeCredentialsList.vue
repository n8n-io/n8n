<script setup lang="ts">
import {
	CredentialDropdownOption,
	useNodeCredentialOptions,
} from '@/components/useNodeCredentialOptions';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { NodeParameterValueType } from 'n8n-workflow';
import { computed } from 'vue';

const { node, overrideCredType } = defineProps<{
	node: INodeUi;
	overrideCredType?: NodeParameterValueType | undefined;
	readonly?: boolean;
}>();

const emit = defineEmits<{
	credentialSelected: [credential: INodeUpdatePropertiesInformation];
}>();

const nodeTypesStore = useNodeTypesStore();
const nodeType = computed(() => nodeTypesStore.getNodeType(node.type, node.typeVersion));
const { credentialTypesNodeDescriptionDisplayed } = useNodeCredentialOptions(
	computed(() => node),
	nodeType,
	computed(() => overrideCredType),
);
const options = computed(() =>
	credentialTypesNodeDescriptionDisplayed.value.flatMap(({ options }) =>
		options.map((option) => ({
			...option,
			isSelected: option.id === node.credentials?.[option.type]?.id,
		})),
	),
);

function handleClickOption(option: CredentialDropdownOption) {
	emit('credentialSelected', {
		name: node.name,
		properties: {
			credentials: {
				...node.credentials,
				[option.type]: { id: option.id, name: option.name },
			},
		},
	});
}
</script>

<template>
	<div :class="$style.component">
		<div
			v-for="option in options"
			:key="option.id"
			:class="{
				[$style.option]: true,
				[$style.selected]: option.isSelected,
			}"
			role="button"
			@click="handleClickOption(option)"
		>
			<div>
				<N8nText tag="div" size="small" bold>{{ option.name }}</N8nText>
				<N8nText tag="div" color="text-light" size="small">{{ option.typeDisplayName }}</N8nText>
			</div>
			<N8nIcon v-if="option.isSelected" icon="check" color="primary" />
		</div>
	</div>
</template>

<style lang="scss" module>
.component {
	padding-block: var(--spacing-2xs);
}

.option {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-3xs) var(--spacing-s);
	cursor: pointer;

	&.selected,
	&:hover {
		background-color: var(--color-background-base);
	}
}
</style>
