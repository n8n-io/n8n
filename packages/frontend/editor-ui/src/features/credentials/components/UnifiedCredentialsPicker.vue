<script setup lang="ts">
/**
 * Unified credential picker: one dropdown covering the invitational
 * "Connect to {node}" entry state, the user's own credentials, and the
 * managed "n8n credits" option.
 *
 * Purely presentational — props in, intent events out. The host
 * (NodeCredentials) owns persistence and telemetry.
 */
import { computed, ref } from 'vue';
import {
	N8nActionPill,
	N8nDropdownMenu,
	N8nIcon,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import TitledList from '@/app/components/TitledList.vue';
import CredentialIcon from './CredentialIcon.vue';

/** An own credential of this type, as listed in the menu. */
export interface CredentialOption {
	id: string;
	name: string;
	typeDisplayName?: string;
	/** End-user (resolvable) credential — user icon and "End-user credential" subtitle. */
	isResolvable?: boolean;
}

/** Discriminates row rendering: leading icon and label layout. */
type ItemKind = 'n8nCredits' | 'n8nCreditsEntry' | 'ownEntry' | 'key' | 'user' | 'create';

interface ItemData {
	kind: ItemKind;
	subtitle?: string;
	/** "$X remaining" / "No credits" status on the n8n credits rows (entry and full menu). */
	pill?: { text: string; type: 'default' | 'danger' };
}

type Item = DropdownMenuItemProps<string, ItemData>;

type Props = {
	/** Credential type of this row — resolves the service icon for the entry state. */
	credentialType: string;
	/** Interpolated into the entry button label, "Connect to {node}". */
	nodeDisplayName: string;
	/** The user's own credentials of this type. */
	options: CredentialOption[];
	/** Selected own credential; ignored while the managed slot is active. */
	selectedCredentialId: string | null;
	/** Whether the slot holds the gateway-managed "n8n credits" credential. */
	isAiGatewayManaged: boolean;
	/** Offer the n8n credits row — false for credential types the gateway does not serve. */
	showN8nCredits?: boolean;
	/** Wallet balance in USD; when undefined, no pill/badge is shown. */
	balance?: number;
	readonly?: boolean;
	/** `create` gates the create / "use my own credential" rows. */
	permissions: PermissionsRecord['credential'];
	/** Issue messages for this credential row; renders the warning affordance. */
	issues?: string[];
	/** Name stored on the node's slot — labels the trigger "{name} (unavailable)" when it no longer resolves. */
	selectedCredentialName?: string | null;
	/** Whether the selected own credential may be edited (end-user credentials can be restricted). */
	canEdit?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	showN8nCredits: true,
	issues: () => [],
	selectedCredentialName: null,
	canEdit: true,
});

const emit = defineEmits<{
	/** The n8n credits row was picked. */
	selectN8nCredits: [];
	/** An own credential row was picked. */
	selectCredential: [id: string];
	/** A create row was picked ("Create a new credential" / "Use my own credential"). */
	createCredential: [];
	/** Pen click — edit the selected own credential. */
	edit: [];
	/** Gear click — open the n8n credits top-up. */
	topUp: [];
}>();

const i18n = useI18n();

/** Mirrors the dropdown's open state to paint the focused border on the trigger. */
const isMenuOpen = ref(false);

// Ids of the two non-credential rows; `onSelect` maps ids back to intents.
const N8N_CREDITS = '__n8n_credits__';
const CREATE = '__create__';
// Rows keep the legacy `node-credentials-select-*` test ids so existing tests
// and E2E selectors resolve unchanged.
const N8N_CREDITS_TEST_ID = 'node-credentials-select-item-n8n-credits';
const CREATE_TEST_ID = 'node-credentials-select-item-new';

// Leading icon + test id per row kind; entry variants share their target's icon.
const ROW_ICONS = {
	n8nCredits: { icon: 'wallet', testId: 'ucp-row-icon-wallet' },
	n8nCreditsEntry: { icon: 'wallet', testId: 'ucp-row-icon-wallet' },
	key: { icon: 'key-round', testId: 'ucp-row-icon-key' },
	ownEntry: { icon: 'key-round', testId: 'ucp-row-icon-key' },
	user: { icon: 'user-round', testId: 'ucp-row-icon-user' },
	create: { icon: 'plus', testId: 'ucp-row-icon-create' },
} as const satisfies Record<ItemKind, { icon: string; testId: string }>;

const selectedOption = computed(
	() => props.options.find((o) => o.id === props.selectedCredentialId) ?? null,
);
/** An own credential is selected; a stale id (credential deleted elsewhere) counts as none. */
const ownCredentialSelected = computed(
	() => !props.isAiGatewayManaged && selectedOption.value !== null,
);
const hasIssues = computed(() => props.issues.length > 0);
/** The stored credential no longer resolves to a usable option (deleted/unshared) but is still named on the node. */
const isUnavailable = computed(
	() =>
		!props.isAiGatewayManaged &&
		!ownCredentialSelected.value &&
		hasIssues.value &&
		!!props.selectedCredentialName,
);
/** Nothing selected → compact "Connect to {node}" button; otherwise a full-width select. */
const hasSelection = computed(
	() => props.isAiGatewayManaged || ownCredentialSelected.value || isUnavailable.value,
);
const hasOwnCredentials = computed(() => props.options.length > 0);
/** Before the first own credential exists, the menu is the two-choice entry list, not the full list. */
const showEntryMenu = computed(() => !props.isAiGatewayManaged && !hasOwnCredentials.value);

const formattedBalance = computed(() =>
	props.balance === undefined ? undefined : `$${Number(props.balance).toFixed(2)}`,
);

const remainingPill = computed<ItemData['pill']>(() => {
	if (formattedBalance.value === undefined) return undefined;
	const depleted = props.balance !== undefined && props.balance <= 0;
	return depleted
		? { text: i18n.baseText('aiGateway.wallet.noCredits'), type: 'danger' }
		: {
				text: i18n.baseText('aiGateway.wallet.balanceRemaining', {
					interpolate: { balance: formattedBalance.value },
				}),
				type: 'default',
			};
});

/** First menu row: the "Use n8n credits" invitation in the entry menu, the balance/status row otherwise. */
const n8nCreditsItem = computed<Item>(() =>
	showEntryMenu.value
		? {
				id: N8N_CREDITS,
				testId: N8N_CREDITS_TEST_ID,
				label: i18n.baseText('aiGateway.picker.useN8nCredits'),
				data: {
					kind: 'n8nCreditsEntry',
					subtitle: i18n.baseText('aiGateway.picker.readyToRun'),
					pill: remainingPill.value,
				},
			}
		: {
				id: N8N_CREDITS,
				testId: N8N_CREDITS_TEST_ID,
				label: i18n.baseText('aiGateway.credentialMode.n8nConnect.title'),
				checked: props.isAiGatewayManaged,
				keepOpen: true,
				data: { kind: 'n8nCredits', pill: remainingPill.value },
			},
);

/**
 * Last menu row — either wording creates a new credential: the invitational
 * "Use my own credential" until the first own credential exists, the plain
 * divided "Create a new credential" after.
 */
const createItem = computed<Item>(() =>
	hasOwnCredentials.value
		? {
				id: CREATE,
				testId: CREATE_TEST_ID,
				label: i18n.baseText('nodeCredentials.createNewCredential'),
				divided: true,
				disabled: !props.permissions.create,
				data: { kind: 'create' },
			}
		: {
				id: CREATE,
				testId: CREATE_TEST_ID,
				label: i18n.baseText('aiGateway.picker.useOwnCredential'),
				disabled: !props.permissions.create,
				data: { kind: 'ownEntry', subtitle: i18n.baseText('aiGateway.picker.bringYourOwnKey') },
			},
);

function toCredentialItem(option: CredentialOption): Item {
	return {
		id: option.id,
		testId: `node-credentials-select-item-${option.id}`,
		label: option.name,
		checked: !props.isAiGatewayManaged && props.selectedCredentialId === option.id,
		keepOpen: true,
		data: {
			kind: option.isResolvable ? 'user' : 'key',
			subtitle: option.isResolvable
				? i18n.baseText('credentialEdit.credentialConfig.credentialType.endUser.title')
				: (option.typeDisplayName ?? ''),
		},
	};
}

const items = computed<Item[]>(() => [
	...(props.showN8nCredits ? [n8nCreditsItem.value] : []),
	...props.options.map(toCredentialItem),
	createItem.value,
]);

/** Leading icon on the trigger; null means the service icon (entry and unavailable states). */
const triggerIcon = computed(() => {
	if (props.isAiGatewayManaged)
		return { icon: 'wallet', testId: 'ucp-trigger-icon-wallet' } as const;
	if (!ownCredentialSelected.value) return null;
	return selectedOption.value?.isResolvable
		? ({ icon: 'user-round', testId: 'ucp-trigger-icon-user' } as const)
		: ({ icon: 'key-round', testId: 'ucp-trigger-icon-key' } as const);
});

const triggerLabel = computed(() => {
	if (props.isAiGatewayManaged) return i18n.baseText('aiGateway.credentialMode.n8nConnect.title');
	if (ownCredentialSelected.value) return selectedOption.value?.name ?? '';
	if (isUnavailable.value)
		return i18n.baseText('nodeCredentials.selectedCredentialUnavailable', {
			interpolate: { name: props.selectedCredentialName ?? '' },
		});
	return i18n.baseText('nodeCredentials.quickConnect.connectTo', {
		interpolate: { provider: props.nodeDisplayName },
	});
});

/** Entry rows stack the subtitle under the title; credential rows flow name + meta as one line. */
function isEntryItem(item: Item): boolean {
	return item.data?.kind === 'n8nCreditsEntry' || item.data?.kind === 'ownEntry';
}

function onSelect(id: string): void {
	if (id === N8N_CREDITS) emit('selectN8nCredits');
	else if (id === CREATE) emit('createCredential');
	else emit('selectCredential', id);
}
</script>

<template>
	<div :class="$style.row">
		<div :class="[$style.control, hasSelection && $style.controlFull]">
			<!-- data-test-id lands on the dropdown's trigger wrapper; `.controlFull` targets it to stretch the trigger. -->
			<N8nDropdownMenu
				:items="items"
				:disabled="readonly"
				placement="bottom-start"
				teleported
				:width="hasSelection ? 'var(--reka-dropdown-menu-trigger-width)' : undefined"
				:extra-popper-class="hasSelection ? $style.menuFull : $style.menuEntry"
				data-test-id="ucp-trigger-wrap"
				@select="onSelect"
				@update:model-value="isMenuOpen = $event"
			>
				<template #trigger>
					<button
						type="button"
						:class="[$style.trigger, isMenuOpen && $style.triggerOpen]"
						data-test-id="node-credentials-select"
						:disabled="readonly"
					>
						<CredentialIcon
							v-if="!triggerIcon"
							:credential-type-name="credentialType"
							:size="16"
							:class="$style.icon"
						/>
						<N8nIcon
							v-else
							:icon="triggerIcon.icon"
							size="large"
							:class="$style.icon"
							:data-test-id="triggerIcon.testId"
						/>

						<span :class="$style.triggerLabel">{{ triggerLabel }}</span>

						<N8nActionPill
							v-if="isAiGatewayManaged && remainingPill"
							size="small"
							:type="remainingPill.type"
							:text="remainingPill.text"
						/>

						<N8nIcon icon="chevron-down" :class="$style.chevron" size="medium" />
					</button>
				</template>

				<template #item-leading="{ item }">
					<N8nIcon
						v-if="item.data"
						:icon="ROW_ICONS[item.data.kind].icon"
						size="large"
						:data-test-id="ROW_ICONS[item.data.kind].testId"
					/>
				</template>

				<template #item-label="{ item }">
					<!-- Entry rows: stacked title/subtitle with the balance pill on the right. -->
					<span v-if="isEntryItem(item)" :class="$style.entryLabel">
						<span :class="$style.itemMain">
							<N8nText size="small" :color="item.disabled ? 'text-light' : 'text-dark'">
								{{ item.label }}
							</N8nText>
							<N8nText v-if="item.data?.subtitle" size="small" color="text-light">
								{{ item.data.subtitle }}
							</N8nText>
						</span>
						<N8nActionPill
							v-if="item.data?.pill"
							size="small"
							:type="item.data.pill.type"
							:text="item.data.pill.text"
							:class="$style.entryPill"
						/>
					</span>
					<!-- Credential rows: name + type/pill flow left as one line, ellipsized at the end. -->
					<span v-else :class="$style.inlineLabel">
						<N8nText size="small" :color="item.disabled ? 'text-light' : 'text-dark'">
							{{ item.label }}
						</N8nText>
						<N8nText
							v-if="item.data?.subtitle"
							size="small"
							color="text-light"
							:class="$style.inlineMeta"
						>
							{{ item.data.subtitle }}
						</N8nText>
						<N8nActionPill
							v-if="item.data?.pill"
							size="small"
							:type="item.data.pill.type"
							:text="item.data.pill.text"
							:class="$style.inlineMeta"
						/>
					</span>
				</template>
			</N8nDropdownMenu>
		</div>

		<N8nTooltip v-if="hasIssues" placement="top">
			<template #content>
				<TitledList :title="`${i18n.baseText('nodeCredentials.issues')}:`" :items="issues" />
			</template>
			<N8nIcon icon="triangle-alert" :class="$style.warning" data-test-id="ucp-issues-warning" />
		</N8nTooltip>

		<N8nTooltip v-if="ownCredentialSelected && selectedOption?.isResolvable" placement="top">
			<template #content>{{ i18n.baseText('credentials.private.tooltip') }}</template>
			<N8nIcon
				icon="user-round-key"
				size="small"
				:class="$style.privateIndicator"
				data-test-id="node-credential-private-icon"
			/>
		</N8nTooltip>

		<button
			v-if="isAiGatewayManaged"
			type="button"
			:class="$style.iconButton"
			data-test-id="ucp-settings-button"
			:disabled="readonly"
			:title="i18n.baseText('aiGateway.toggle.topUp')"
			@click="emit('topUp')"
		>
			<N8nIcon icon="settings" size="medium" />
		</button>
		<button
			v-else-if="ownCredentialSelected && canEdit"
			type="button"
			:class="$style.iconButton"
			data-test-id="credential-edit-button"
			:disabled="readonly"
			:title="i18n.baseText('nodeCredentials.updateCredential')"
			@click="emit('edit')"
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
	width: 100%;
}

.control {
	display: flex;
	min-width: 0;
}

// Stretch the design-system trigger wrapper (an inline-flex span that hugs
// content) so the selected-state trigger — and the menu, which mirrors the
// trigger width — fill the row. `:global()` because `:deep()` only works in
// scoped styles, not modules.
.controlFull {
	flex: 1;
	min-width: 0;

	:global([data-test-id='ucp-trigger-wrap']) {
		display: flex;
		flex: 1 1 auto;
		width: 100%;
		min-width: 0;
	}
}

.trigger {
	width: 100%;
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

// Focused look while the menu is open, matching the design's input focus ring.
.triggerOpen {
	border-color: var(--focus--border-color);
	outline: var(--focus--border-width) solid var(--focus--outline-color);
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

// The design-system content box is fit-content capped at the width prop.
// Selected state: pin the menu to exactly the trigger width.
.menuFull[data-menu-content] {
	width: var(--n8n--dropdown-menu-width);
}

// Entry state: wider than its content so the balance pill right-aligns with
// clear air past the row text, and never narrower than the trigger so the menu
// doesn't underhang the button.
.menuEntry[data-menu-content] {
	min-width: max(
		var(--reka-dropdown-menu-trigger-width),
		calc(var(--spacing--5xl) + var(--spacing--xl))
	);
}

.entryLabel {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
}

.itemMain {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	min-width: 0;

	// Single-line title/subtitle: ellipsize instead of wrapping when the row
	// outgrows the menu width.
	> * {
		max-width: 100%;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.entryPill {
	flex-shrink: 0;
}

// Name + type/pill flow left as a single line; overflow ellipsizes at the end
// of the line (inline children inside one clipping block).
.inlineLabel {
	display: block;
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.inlineMeta {
	margin-left: var(--spacing--2xs);
	vertical-align: middle;
}

.warning {
	flex-shrink: 0;
	color: var(--color--danger);
}

.privateIndicator {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
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
