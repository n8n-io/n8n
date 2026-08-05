<script setup lang="ts">
import { computed } from 'vue';
import {
	N8nActionPill,
	N8nBadge,
	N8nDropdownMenu,
	N8nIcon,
	N8nText,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import CredentialIcon from './CredentialIcon.vue';

export interface CredentialOption {
	id: string;
	name: string;
	typeDisplayName?: string;
	isResolvable?: boolean;
}

type ItemKind = 'n8nCredits' | 'n8nCreditsEntry' | 'ownEntry' | 'key' | 'user' | 'create';

interface ItemData {
	kind: ItemKind;
	subtitle?: string;
	pill?: { text: string; type: 'default' | 'danger' };
	freeBadge?: string;
}

type Item = DropdownMenuItemProps<string, ItemData>;

const props = defineProps<{
	credentialType: string;
	nodeDisplayName: string;
	options: CredentialOption[];
	selectedCredentialId: string | null;
	isAiGatewayManaged: boolean;
	balance?: number;
	readonly?: boolean;
	permissions: PermissionsRecord['credential'];
}>();

const emit = defineEmits<{
	selectN8nCredits: [];
	selectCredential: [id: string];
	createCredential: [];
	edit: [];
	topUp: [];
}>();

const i18n = useI18n();

// Menu item ids double as select values; `onSelect` maps them back to intents.
const N8N_CREDITS = '__n8n_credits__';
const CREATE = '__create__';

const selectedOption = computed(
	() => props.options.find((o) => o.id === props.selectedCredentialId) ?? null,
);
// A stale/missing id (cred deleted elsewhere) reads as "nothing selected".
const ownSelected = computed(() => !props.isAiGatewayManaged && selectedOption.value !== null);
const isEntry = computed(() => !props.isAiGatewayManaged && !ownSelected.value);
// The two-choice entry menu only stands in for the true first-run state; once any
// own credential exists the full list is shown even while nothing is selected.
const showEntryMenu = computed(() => !props.isAiGatewayManaged && props.options.length === 0);

const formattedBalance = computed(() =>
	props.balance === undefined ? undefined : `$${Number(props.balance).toFixed(2)}`,
);
const isDepleted = computed(() => props.balance !== undefined && props.balance <= 0);

const remainingPill = computed<ItemData['pill']>(() => {
	if (formattedBalance.value === undefined) return undefined;
	return isDepleted.value
		? { text: i18n.baseText('aiGateway.wallet.noCredits'), type: 'danger' }
		: {
				text: i18n.baseText('aiGateway.wallet.balanceRemaining', {
					interpolate: { balance: formattedBalance.value },
				}),
				type: 'default',
			};
});

const freeBadge = computed(() =>
	formattedBalance.value === undefined
		? undefined
		: i18n.baseText('aiGateway.wallet.balanceFree', {
				interpolate: { balance: formattedBalance.value },
			}),
);

function credentialKind(option: CredentialOption): 'key' | 'user' {
	return option.isResolvable ? 'user' : 'key';
}

function credentialSubtitle(option: CredentialOption): string {
	return option.isResolvable
		? i18n.baseText('credentialEdit.credentialConfig.credentialType.endUser.title')
		: (option.typeDisplayName ?? '');
}

const items = computed<Item[]>(() => {
	if (showEntryMenu.value) {
		return [
			{
				id: N8N_CREDITS,
				testId: 'node-credentials-select-item-n8n-credits',
				label: i18n.baseText('aiGateway.picker.useN8nCredits'),
				data: {
					kind: 'n8nCreditsEntry',
					subtitle: i18n.baseText('aiGateway.picker.readyToRun'),
					freeBadge: freeBadge.value,
				},
			},
			{
				id: CREATE,
				testId: 'node-credentials-select-item-new',
				label: i18n.baseText('aiGateway.picker.useOwnCredential'),
				disabled: !props.permissions.create,
				data: { kind: 'ownEntry', subtitle: i18n.baseText('aiGateway.picker.bringYourOwnKey') },
			},
		];
	}

	const credentialItems = props.options.map<Item>((option) => ({
		id: option.id,
		testId: `node-credentials-select-item-${option.id}`,
		label: option.name,
		checked: !props.isAiGatewayManaged && props.selectedCredentialId === option.id,
		keepOpen: true,
		data: { kind: credentialKind(option), subtitle: credentialSubtitle(option) },
	}));

	return [
		{
			id: N8N_CREDITS,
			testId: 'node-credentials-select-item-n8n-credits',
			label: i18n.baseText('aiGateway.credentialMode.n8nConnect.title'),
			checked: props.isAiGatewayManaged,
			keepOpen: true,
			data: { kind: 'n8nCredits', pill: remainingPill.value },
		},
		...credentialItems,
		{
			id: CREATE,
			testId: 'node-credentials-select-item-new',
			label: i18n.baseText('nodeCredentials.createNewCredential'),
			divided: true,
			disabled: !props.permissions.create,
			data: { kind: 'create' },
		},
	];
});

const triggerLabel = computed(() => {
	if (props.isAiGatewayManaged) return i18n.baseText('aiGateway.credentialMode.n8nConnect.title');
	if (ownSelected.value) return selectedOption.value?.name ?? '';
	return i18n.baseText('nodeCredentials.quickConnect.connectTo', {
		interpolate: { provider: props.nodeDisplayName },
	});
});

function onSelect(id: string): void {
	if (props.readonly) return;
	if (id === N8N_CREDITS) emit('selectN8nCredits');
	else if (id === CREATE) emit('createCredential');
	else emit('selectCredential', id);
}

function onEdit(): void {
	if (!props.readonly) emit('edit');
}

function onTopUp(): void {
	if (!props.readonly) emit('topUp');
}
</script>

<template>
	<div :class="$style.row">
		<N8nDropdownMenu
			:items="items"
			:disabled="readonly"
			placement="bottom-start"
			teleported
			width="var(--reka-dropdown-menu-trigger-width)"
			@select="onSelect"
		>
			<template #trigger>
				<button
					type="button"
					:class="$style.trigger"
					data-test-id="node-credentials-select"
					:disabled="readonly"
				>
					<CredentialIcon
						v-if="isEntry"
						:credential-type-name="credentialType"
						:class="$style.icon"
					/>
					<N8nIcon
						v-else-if="isAiGatewayManaged"
						icon="wallet"
						:class="$style.icon"
						data-test-id="ucp-trigger-icon-wallet"
					/>
					<N8nIcon
						v-else-if="selectedOption?.isResolvable"
						icon="user-round"
						:class="$style.icon"
						data-test-id="ucp-trigger-icon-user"
					/>
					<N8nIcon
						v-else
						icon="key-round"
						:class="$style.icon"
						data-test-id="ucp-trigger-icon-key"
					/>

					<span :class="$style.triggerLabel">{{ triggerLabel }}</span>

					<N8nActionPill
						v-if="isAiGatewayManaged && remainingPill"
						size="small"
						:type="remainingPill.type"
						:text="remainingPill.text"
						:clickable="!readonly"
						@click.stop="onTopUp"
					/>

					<N8nIcon icon="chevron-down" :class="$style.chevron" size="medium" />
				</button>
			</template>

			<template #item-leading="{ item }">
				<N8nIcon
					v-if="item.data?.kind === 'n8nCredits' || item.data?.kind === 'n8nCreditsEntry'"
					icon="wallet"
					size="medium"
					data-test-id="ucp-row-icon-wallet"
				/>
				<N8nIcon
					v-else-if="item.data?.kind === 'user'"
					icon="user-round"
					size="medium"
					data-test-id="ucp-row-icon-user"
				/>
				<N8nIcon
					v-else-if="item.data?.kind === 'key' || item.data?.kind === 'ownEntry'"
					icon="key-round"
					size="medium"
					data-test-id="ucp-row-icon-key"
				/>
				<N8nIcon v-else-if="item.data?.kind === 'create'" icon="plus" size="medium" />
			</template>

			<template #item-label="{ item }">
				<span :class="$style.itemLabel">
					<N8nText size="small" color="text-dark">{{ item.label }}</N8nText>
					<N8nText v-if="item.data?.subtitle" size="small" color="text-light">
						{{ item.data.subtitle }}
					</N8nText>
				</span>
				<N8nActionPill
					v-if="item.data?.pill"
					size="small"
					:type="item.data.pill.type"
					:text="item.data.pill.text"
				/>
				<N8nBadge v-if="item.data?.freeBadge" theme="success" size="small">
					{{ item.data.freeBadge }}
				</N8nBadge>
			</template>
		</N8nDropdownMenu>

		<button
			v-if="isAiGatewayManaged"
			type="button"
			:class="$style.iconButton"
			data-test-id="ucp-settings-button"
			disabled
		>
			<N8nIcon icon="settings" size="medium" />
		</button>
		<button
			v-else-if="ownSelected"
			type="button"
			:class="$style.iconButton"
			data-test-id="credential-edit-button"
			:disabled="readonly"
			:title="i18n.baseText('nodeCredentials.updateCredential')"
			@click="onEdit"
		>
			<N8nIcon icon="pen" size="medium" />
		</button>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.trigger {
	flex: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	height: var(--height--sm);
	padding: 0 var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--2xs);
	background-color: var(--background--surface);
	font: inherit;
	cursor: pointer;

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.triggerLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	text-align: left;
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.itemLabel {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
	flex: 1;
}

.iconButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--height--sm);
	height: var(--height--sm);
	border: none;
	border-radius: var(--radius--2xs);
	background: transparent;
	cursor: pointer;
	color: var(--color--text--shade-1);

	&:hover:not(:disabled) {
		background-color: var(--color--foreground);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}
</style>
