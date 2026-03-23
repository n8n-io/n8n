<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import { N8nIcon, N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { nextTick, ref, computed } from 'vue';
import type { PermissionsRecord } from '@n8n/permissions';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

export type CredentialOption = {
	id: string;
	name: string;
	typeDisplayName: string | undefined;
	homeProject?: ProjectSharingData;
};

const props = defineProps<{
	credentialOptions: CredentialOption[];
	selectedCredentialId: string | null;
	permissions: PermissionsRecord['credential'];
}>();

const emit = defineEmits<{
	credentialSelected: [credentialId: string];
	newCredential: [];
}>();

const i18n = useI18n();

const selectRefs = ref<InstanceType<typeof N8nSelect> | null>(null);
const filter = ref('');

function matches(needle: string, haystack: string) {
	return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

const filteredOptions = computed(() => {
	if (!filter.value) return props.credentialOptions;
	return props.credentialOptions.filter(
		(option) =>
			matches(filter.value, option.name) ||
			(option.homeProject?.name && matches(filter.value, option.homeProject.name)),
	);
});

const onFilter = (newFilter = '') => {
	filter.value = newFilter;
};

const onCredentialSelected = (credentialId: string) => {
	emit('credentialSelected', credentialId);
};

const onCreateNewCredential = async () => {
	selectRefs.value?.blur();
	await nextTick();
	emit('newCredential');
};
</script>

<template>
	<N8nSelect
		ref="selectRefs"
		size="small"
		filterable
		:filter-method="onFilter"
		:model-value="props.selectedCredentialId"
		:popper-class="$style.selectPopper"
		@update:model-value="onCredentialSelected"
	>
		<N8nOption
			v-for="item in filteredOptions"
			:key="item.id"
			:data-test-id="`node-credentials-select-item-${item.id}`"
			:label="item.name"
			:value="item.id"
		>
			<div :class="[$style.credentialOption, 'mt-2xs mb-2xs']">
				<N8nText bold>{{ item.name }}</N8nText>
				<N8nText v-if="item.homeProject" size="small">
					{{ `${item.typeDisplayName} - ${item.homeProject?.name}` }}
				</N8nText>
				<N8nText v-else size="small">{{ item.typeDisplayName }}</N8nText>
			</div>
		</N8nOption>
		<template #empty> </template>
		<template #footer>
			<N8nTooltip
				:disabled="props.permissions.create"
				:content="i18n.baseText('nodeCredentials.createNew.permissionDenied')"
				:placement="'top'"
			>
				<button
					type="button"
					data-test-id="node-credentials-select-item-new"
					:class="[$style.newCredential]"
					:disabled="!props.permissions.create"
					@click="onCreateNewCredential()"
				>
					<N8nIcon size="xsmall" icon="plus" />
					{{ i18n.baseText('nodeCredentials.createNew') }}
				</button>
			</N8nTooltip>
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

.credentialOption {
	display: flex;
	flex-direction: column;
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
