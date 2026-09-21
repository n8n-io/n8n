<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import {
	N8nActionPill,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
	type SelectSize,
} from '@n8n/design-system';
import { nextTick, ref, computed } from 'vue';
import type { PermissionsRecord } from '@n8n/permissions';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

export type CredentialOption = {
	id: string;
	name: string;
	typeDisplayName: string | undefined;
	homeProject?: ProjectSharingData;
};

/**
 * A pinned, non-credential option rendered above the credential list — used for
 * the managed "Gateway credits" row. Matches the NodeCredentials look: wallet
 * icon, label, a balance pill, and a checkmark when selected.
 */
export type ManagedCredentialOption = {
	value: string;
	label: string;
	pill?: { text: string; type: 'default' | 'danger' | 'info' };
};

const props = defineProps<{
	credentialOptions: CredentialOption[];
	selectedCredentialId: string | null;
	permissions: PermissionsRecord['credential'];
	placeholder?: string;
	loading?: boolean;
	disabled?: boolean;
	teleported?: boolean;
	size?: SelectSize;
	managedOption?: ManagedCredentialOption | null;
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

const showManagedOption = computed(
	() => props.managedOption && (!filter.value || matches(filter.value, props.managedOption.label)),
);

const isManagedSelected = computed(
	() => props.managedOption != null && props.selectedCredentialId === props.managedOption.value,
);

const onFilter = (newFilter = '') => {
	filter.value = newFilter;
};

const closeSelect = () => {
	selectRefs.value?.innerSelect?.handleClose();
	selectRefs.value?.blur();
};

const onCredentialSelected = (credentialId: string) => {
	closeSelect();
	emit('credentialSelected', credentialId);
};

const onCreateNewCredential = async () => {
	closeSelect();
	await nextTick();
	emit('newCredential');
};
</script>

<template>
	<N8nSelect
		ref="selectRefs"
		:size="props.size ?? 'small'"
		filterable
		:filter-method="onFilter"
		:model-value="props.selectedCredentialId"
		:placeholder="props.placeholder"
		:loading="props.loading"
		:disabled="props.disabled"
		:teleported="props.teleported ?? false"
		:popper-class="$style.selectPopper"
		@update:model-value="onCredentialSelected"
	>
		<template v-if="isManagedSelected" #prefix>
			<N8nIcon icon="wallet" size="large" :class="$style.optionIcon" />
		</template>
		<N8nOption
			v-if="showManagedOption && managedOption"
			:key="managedOption.value"
			:data-test-id="`node-credentials-select-item-${managedOption.value}`"
			:label="managedOption.label"
			:value="managedOption.value"
			@click="closeSelect"
		>
			<div :class="$style.managedOption">
				<N8nIcon icon="wallet" size="large" :class="$style.optionIcon" />
				<N8nText :class="$style.managedOptionName">{{ managedOption.label }}</N8nText>
				<N8nActionPill
					v-if="managedOption.pill"
					size="small"
					:type="managedOption.pill.type"
					:text="managedOption.pill.text"
				/>
				<N8nIcon v-if="isManagedSelected" icon="check" size="large" :class="$style.checkIcon" />
			</div>
		</N8nOption>
		<N8nOption
			v-for="item in filteredOptions"
			:key="item.id"
			:data-test-id="`node-credentials-select-item-${item.id}`"
			:label="item.name"
			:value="item.id"
			@click="closeSelect"
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

.managedOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.optionIcon {
	display: flex;
	align-items: center;
}

.managedOptionName {
	color: var(--color--text);
}

.checkIcon {
	flex-shrink: 0;
	margin-left: auto;
	color: var(--color--text--shade-1);
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
