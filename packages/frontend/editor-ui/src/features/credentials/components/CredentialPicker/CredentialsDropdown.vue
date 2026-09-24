<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import {
	N8nBadge,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
	type IconName,
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
	() => !!props.managedOption && props.selectedCredentialId === props.managedOption.value,
);

// Leading icon shown in the collapsed trigger for the current selection —
// wallet for managed credits, a key for a stored credential, none otherwise.
const selectedPrefixIcon = computed<IconName | undefined>(() => {
	if (isManagedSelected.value) return 'wallet';
	if (props.selectedCredentialId) return 'key-round';
	return undefined;
});

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
	<div :class="$style.selectContainer">
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
			:class="{ [$style.selectWithBalance]: isManagedSelected && managedOption?.pill }"
			:popper-class="$style.selectPopper"
			@update:model-value="onCredentialSelected"
		>
			<template v-if="selectedPrefixIcon" #prefix>
				<N8nIcon :icon="selectedPrefixIcon" size="large" :class="$style.optionIcon" />
			</template>
			<N8nOption
				v-if="showManagedOption && managedOption"
				:key="managedOption.value"
				:data-test-id="`node-credentials-select-item-${managedOption.value}`"
				:label="managedOption.label"
				:value="managedOption.value"
				@click="closeSelect"
			>
				<div :class="$style.credentialOption">
					<N8nIcon icon="wallet" size="large" :class="$style.optionIcon" />
					<N8nText :class="$style.optionName">{{ managedOption.label }}</N8nText>
					<N8nBadge
						v-if="managedOption.pill"
						size="xxsmall"
						:variant="
							managedOption.pill.type === 'danger' || managedOption.pill.type === 'info'
								? managedOption.pill.type
								: 'success'
						"
					>
						{{ managedOption.pill.text }}
					</N8nBadge>
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
				<div :class="$style.credentialOption">
					<N8nIcon icon="key-round" size="large" :class="$style.optionIcon" />
					<div :class="$style.optionText">
						<div :class="$style.optionPrimary">
							<N8nText :class="$style.optionName">{{ item.name }}</N8nText>
							<N8nText v-if="item.typeDisplayName" color="text-light" :class="$style.optionType">
								{{ item.typeDisplayName }}
							</N8nText>
						</div>
						<N8nText v-if="item.homeProject?.name" color="text-light" :class="$style.optionOwner">
							{{ item.homeProject.name }}
						</N8nText>
					</div>
					<N8nIcon
						v-if="props.selectedCredentialId === item.id"
						icon="check"
						size="large"
						:class="$style.checkIcon"
					/>
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
						<N8nIcon size="large" icon="plus" :class="$style.optionIcon" />
						{{ i18n.baseText('nodeCredentials.createNew') }}
					</button>
				</N8nTooltip>
			</template>
		</N8nSelect>
		<div
			v-if="isManagedSelected && managedOption?.pill && !filter"
			data-test-id="credential-balance-indicator"
			:class="$style.balanceIndicator"
		>
			<!-- Invisible copy of the selected label reserves its rendered width so the
			     badge sits the same gap after it as in the dropdown row. -->
			<span :class="$style.balanceLabelSizer" aria-hidden="true">{{ managedOption.label }}</span>
			<N8nBadge
				size="xxsmall"
				:variant="
					managedOption.pill.type === 'danger' || managedOption.pill.type === 'info'
						? managedOption.pill.type
						: 'success'
				"
			>
				{{ managedOption.pill.text }}
			</N8nBadge>
		</div>
	</div>
</template>

<style lang="scss" module>
.selectContainer {
	--credential-select-side-padding: var(--spacing--2xs);
	--credential-select-icon-size: var(--spacing--sm);
	--credential-select-icon-gap: var(--spacing--3xs);
	--credential-select-label-padding: calc(
		var(--credential-select-side-padding) + var(--credential-select-icon-size) +
			var(--credential-select-icon-gap)
	);

	position: relative;
	flex: 1;
	display: grid;
	grid-template-areas: 'control';
	width: 100%;

	> :global(.n8n-select),
	.balanceIndicator {
		grid-area: control;
	}

	:global(.el-input__prefix-inner > :last-child) {
		margin-right: var(--spacing--3xs);
	}

	:global(.el-select .el-input__prefix) {
		left: var(--credential-select-side-padding);
	}

	:global(.el-select .el-input.el-input--prefix .el-input__inner) {
		padding-left: var(--credential-select-label-padding);
	}
}

.selectWithBalance {
	:global(.el-input__inner) {
		padding-right: 44px;
	}
}

.selectPopper {
	// Give the menu a comfortable floor width so long credential/owner text has
	// room; el-select pins the popper min-width inline, hence the important.
	min-width: calc(var(--spacing--5xl) + var(--spacing--2xl)) !important;

	:global(.el-select-dropdown__list) {
		padding: var(--spacing--4xs) 0;
	}

	// Keep the footer divider full-width while the create row keeps the same
	// inset hover shape as the options above it.
	:global(.el-select-dropdown__footer) {
		padding: var(--spacing--4xs) 0;
		border-top: var(--border);
	}

	:global(.el-select-dropdown__item) {
		display: flex;
		align-items: center;
		height: auto;
		margin: 0 var(--spacing--4xs);
		padding: var(--spacing--4xs) var(--spacing--2xs);
		line-height: var(--line-height--md);
		border-radius: var(--radius);
	}

	// Neutralise el-select's primary-coloured selected state; the checkmark marks
	// selection instead.
	:global(.el-select-dropdown__item.selected) {
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--regular);
	}

	:has(.newCredential:hover) :global(.hover) {
		background-color: transparent;
	}

	&:not(:has(li)) {
		:global(.el-select-dropdown__footer) {
			border-top: none;
		}

		.newCredential {
			border-radius: var(--radius);
		}
	}
}

.credentialOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	width: 100%;
}

// Stacked text for a stored credential: name + type on the first line, owner
// on the second.
.optionText {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.optionPrimary {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.optionIcon {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.optionName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.optionType {
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
}

.optionOwner {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--2xs);
}

.checkIcon {
	flex-shrink: 0;
	margin-left: auto;
	color: var(--color--text--shade-1);
}

// Non-interactive balance pill rendered over the collapsed select.
.balanceIndicator {
	display: flex;
	align-items: center;
	align-self: center;
	justify-self: start;
	gap: var(--spacing--xs);
	padding-left: var(--credential-select-label-padding);
	max-width: calc(100% - 44px);
	z-index: 1;
	pointer-events: none;
}

// Mirrors the el-select trigger label width so the badge lands right after it.
.balanceLabelSizer {
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	visibility: hidden;
}

// Re-skin the balance/pill spans to a neutral badge, matching NodeCredentials.
.balanceIndicator > span:not(.balanceLabelSizer),
.credentialOption > .optionName + span {
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius);
	background-color: light-dark(var(--color--neutral-200), var(--color--neutral-700));
	color: light-dark(var(--color--neutral-750), var(--color--neutral-150));
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--sm);
}

.newCredential {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: calc(100% - 2 * var(--spacing--4xs));
	margin: 0 var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--2xs);
	background-color: transparent;
	color: var(--color--text--shade-1);
	border: 0;
	border-radius: var(--radius);

	&:not([disabled]) {
		cursor: pointer;
		&:hover {
			background-color: light-dark(
				var(--color--background--light-2),
				var(--menu--color--background--hover)
			);
		}
	}

	&[disabled] {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
</style>
