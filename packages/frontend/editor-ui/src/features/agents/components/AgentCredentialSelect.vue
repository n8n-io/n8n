<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import N8nOption from '@n8n/design-system/components/N8nOption';

export interface AgentCredentialOption {
	id: string;
	name: string;
}

const props = defineProps<{
	modelValue?: string;
	credentials: AgentCredentialOption[];
	placeholder: string;
	createLabel: string;
	dataTestId: string;
	loading?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [credentialId: string];
	create: [];
}>();

const selectRef = ref<InstanceType<typeof N8nSelect> | null>(null);
const filter = ref('');

const sortedCredentials = computed(() =>
	[...props.credentials].sort((a, b) => {
		const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
		return byName === 0 ? a.id.localeCompare(b.id) : byName;
	}),
);

const filteredCredentials = computed(() =>
	sortedCredentials.value.filter((credential) => matches(filter.value, credential.name)),
);

function setFilter(newFilter = '') {
	filter.value = newFilter;
}

function matches(needle: string, haystack: string) {
	return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

async function onCreateCredential() {
	selectRef.value?.blur();
	await nextTick();
	emit('create');
}
</script>

<template>
	<N8nSelect
		ref="selectRef"
		:model-value="modelValue"
		:placeholder="placeholder"
		:loading="loading"
		:disabled="disabled"
		size="medium"
		filterable
		:filter-method="setFilter"
		:popper-class="$style.selectPopper"
		:data-testid="dataTestId"
		@update:model-value="(value: string) => emit('update:modelValue', value)"
	>
		<N8nOption
			v-for="credential in filteredCredentials"
			:key="credential.id"
			:value="credential.id"
			:label="credential.name"
		/>
		<template #empty> </template>
		<template #footer>
			<button
				type="button"
				:class="$style.newCredential"
				:data-testid="`${dataTestId}-create`"
				@click="onCreateCredential"
			>
				<N8nIcon icon="plus" size="xsmall" />
				{{ createLabel }}
			</button>
		</template>
	</N8nSelect>
</template>

<style lang="scss" module>
.selectPopper {
	:global(.el-select-dropdown__list) {
		padding: 0;
	}

	:has(.newCredential:hover) :global(.hover) {
		background-color: transparent;
	}

	&:not(:has(li)) .newCredential {
		border-top: none;
		box-shadow: none;
		border-radius: var(--radius);
	}
}

.newCredential {
	display: flex;
	width: 100%;
	gap: var(--spacing--3xs);
	align-items: center;
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--color--background--light-2);
	color: var(--color--text--shade-1);

	border: 0;
	border-top: var(--border);
	box-shadow: var(--shadow--light);
	clip-path: inset(-12px 0 0 0); // Only show box shadow on top

	&:not([disabled]) {
		cursor: pointer;
		&:hover {
			color: var(--color--primary);
		}
	}

	&[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
</style>
