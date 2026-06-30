<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { EgressDecision, EgressProtectionModeDto } from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useEgressProtectionStore } from './egressProtection.store';
import type { EgressListField } from './egressProtection.store';
import { EGRESS_PROTECTION_MODES } from './egressProtection.constants';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const store = useEgressProtectionStore();

// Grid order: each row is a target type, each column an allow/block decision.
// Row 1 = hostnames (allow, block), row 2 = IP ranges (allow, block).
const listFields: EgressListField[] = [
	'allowedHostnames',
	'blockedHostnames',
	'allowedIpRanges',
	'blockedIpRanges',
];

// One pending input per list editor, so the user can type before adding.
const newEntry = ref<Record<EgressListField, string>>({
	blockedIpRanges: '',
	allowedIpRanges: '',
	allowedHostnames: '',
	blockedHostnames: '',
});

const editable = computed(() => store.editable);

// The built-in default blocked IP ranges are always enforced and read-only. They
// only apply to the blocked IP ranges cell; the ~14 ranges are collapsed by
// default to keep the cell compact.
const expandedBaseline = ref<Record<EgressListField, boolean>>({
	blockedIpRanges: false,
	allowedIpRanges: false,
	allowedHostnames: false,
	blockedHostnames: false,
});

function toggleBaseline(field: EgressListField): void {
	expandedBaseline.value[field] = !expandedBaseline.value[field];
}

// Only blocked IP ranges have a non-removable built-in floor; the other lists
// are fully editable and have no locked entries.
function baselineFor(field: EgressListField): string[] {
	return field === 'blockedIpRanges' ? (store.policy?.defaultBlockedIpRanges ?? []) : [];
}

function overrideFor(field: EgressListField): string[] {
	return store.draft?.[field] ?? [];
}

// Allow vs block drives the green/red colour treatment.
function listKind(field: EgressListField): 'allow' | 'block' {
	return field.startsWith('allowed') ? 'allow' : 'block';
}

// Hostname vs IP range drives the per-cell type label and add-input placeholder.
function listType(field: EgressListField): 'hostnames' | 'ipRanges' {
	return field.toLowerCase().includes('hostname') ? 'hostnames' : 'ipRanges';
}

function typeLabel(field: EgressListField): string {
	return i18n.baseText(`settings.egressProtection.list.type.${listType(field)}`);
}

function modeLabel(mode: EgressProtectionModeDto): string {
	return i18n.baseText(`settings.egressProtection.mode.option.${mode}`);
}

function modeDescription(mode: EgressProtectionModeDto): string {
	return i18n.baseText(`settings.egressProtection.mode.option.${mode}.description`);
}

// A colour + icon + status badge so the active mode is legible at a glance,
// not only as the dropdown's selected text.
const MODE_SIGN = {
	off: { icon: 'circle-minus', theme: 'default' },
	log: { icon: 'eye', theme: 'warning' },
	enforce: { icon: 'shield', theme: 'success' },
} as const;

const modeSign = computed(() => MODE_SIGN[store.draft?.mode ?? 'log']);

const modeStatusLabel = computed(() =>
	i18n.baseText(`settings.egressProtection.mode.status.${store.draft?.mode ?? 'log'}`),
);

// --- Auto-save: every change persists immediately; errors roll back and toast. ---

async function onModeChange(mode: EgressProtectionModeDto): Promise<void> {
	try {
		await store.updateMode(mode);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.egressProtection.savedError'));
	}
}

async function onAddEntry(field: EgressListField): Promise<void> {
	if (!newEntry.value[field].trim()) return;
	try {
		await store.addEntry(field, newEntry.value[field]);
		newEntry.value[field] = '';
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.egressProtection.savedError'));
	}
}

async function onRemoveEntry(field: EgressListField, index: number): Promise<void> {
	try {
		await store.removeEntry(field, index);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.egressProtection.savedError'));
	}
}

const saveStatus = computed(() => {
	switch (store.saveState) {
		case 'saved':
			return {
				icon: 'circle-check',
				spin: false,
				label: i18n.baseText('settings.egressProtection.autosave.saved'),
			};
		case 'error':
			return {
				icon: 'triangle-alert',
				spin: false,
				label: i18n.baseText('settings.egressProtection.autosave.error'),
			};
		default:
			return {
				icon: 'spinner',
				spin: true,
				label: i18n.baseText('settings.egressProtection.autosave.saving'),
			};
	}
});

// --- Calibration ---

const calibrationDestinations = computed(() => store.calibration?.destinations ?? []);

// Per-row decision reflects what actually happened when the destination was
// recorded, not the current mode.
function decisionLabel(decision: EgressDecision): string {
	return decision === 'blocked'
		? i18n.baseText('settings.egressProtection.calibration.decision.blocked')
		: i18n.baseText('settings.egressProtection.calibration.decision.wouldBlock');
}

function formatTimestamp(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

async function refreshCalibration(): Promise<void> {
	try {
		await store.fetchCalibration();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.egressProtection.calibration.refreshError'));
	}
}

async function clearCalibration(): Promise<void> {
	try {
		await store.clearCalibration();
		toast.showMessage({
			title: i18n.baseText('settings.egressProtection.calibration.clearedSuccess'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.egressProtection.calibration.clearError'));
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.egressProtection.title'));
	await store.fetchPolicy();
	await refreshCalibration();
});
</script>

<template>
	<div class="pb-2xl">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.egressProtection.title') }}
			</N8nHeading>
			<!-- Auto-save status: no Save button; changes persist as they are made. -->
			<div
				v-if="editable && store.saveState !== 'idle'"
				:class="[$style.saveStatus, $style[`saveStatus_${store.saveState}`]]"
				data-test-id="egress-save-status"
				role="status"
				aria-live="polite"
			>
				<N8nIcon :icon="saveStatus.icon" :spin="saveStatus.spin" size="xsmall" />
				<N8nText size="small" color="text-light">{{ saveStatus.label }}</N8nText>
			</div>
		</div>
		<p :class="$style.description">
			{{ i18n.baseText('settings.egressProtection.description') }}
		</p>

		<div v-if="store.loading" :class="$style.loading" data-test-id="egress-loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<template v-if="!store.loading">
			<N8nNotice
				v-if="!editable"
				class="mb-l"
				:content="
					i18n.baseText(
						store.policy?.managedByEnv
							? 'settings.egressProtection.managedByEnv'
							: 'settings.egressProtection.managedByPlatform',
					)
				"
				data-test-id="egress-managed-notice"
			/>

			<!-- Mode selector -->
			<N8nHeading tag="h2" size="medium" :class="$style.sectionHeading">
				{{ i18n.baseText('settings.egressProtection.mode.title') }}
			</N8nHeading>
			<div :class="[$style.card, store.draft ? $style[`modeCard_${store.draft.mode}`] : undefined]">
				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<label id="egress-mode-label">{{
							i18n.baseText('settings.egressProtection.mode.label')
						}}</label>
						<small v-if="store.draft">{{ modeDescription(store.draft.mode) }}</small>
						<N8nBadge
							v-if="store.draft"
							:theme="modeSign.theme"
							:class="$style.modeStatus"
							data-test-id="egress-mode-status"
						>
							<N8nIcon :icon="modeSign.icon" size="xsmall" />
							{{ modeStatusLabel }}
						</N8nBadge>
					</div>
					<div :class="$style.settingsItemControl">
						<N8nSelect
							v-if="store.draft"
							:model-value="store.draft.mode"
							size="medium"
							:disabled="!editable"
							aria-labelledby="egress-mode-label"
							data-test-id="egress-mode-select"
							@update:model-value="onModeChange"
						>
							<N8nOption
								v-for="mode in EGRESS_PROTECTION_MODES"
								:key="mode"
								:value="mode"
								:label="modeLabel(mode)"
							/>
						</N8nSelect>
					</div>
				</div>
			</div>

			<!-- Allow / block matrix: columns = decision (allowed/blocked), rows = target type -->
			<N8nHeading tag="h2" size="medium" :class="$style.sectionHeading">
				{{ i18n.baseText('settings.egressProtection.list.title') }}
			</N8nHeading>
			<div :class="$style.matrix" data-test-id="egress-lists">
				<div :class="[$style.matrixHead, $style.accent_allow]">
					<N8nIcon icon="circle-check" size="small" />
					<N8nText size="small" bold color="text-base">{{
						i18n.baseText('settings.egressProtection.list.column.allowed')
					}}</N8nText>
				</div>
				<div :class="[$style.matrixHead, $style.accent_block]">
					<N8nIcon icon="circle-x" size="small" />
					<N8nText size="small" bold color="text-base">{{
						i18n.baseText('settings.egressProtection.list.column.blocked')
					}}</N8nText>
				</div>

				<div
					v-for="field in listFields"
					:key="field"
					:class="[$style.cell, $style[`cardAccent_${listKind(field)}`]]"
				>
					<div :class="$style.cellTitle">
						<N8nText size="small" bold>{{ typeLabel(field) }}</N8nText>
						<N8nTooltip placement="top" :teleported="false">
							<template #content>{{
								i18n.baseText(`settings.egressProtection.list.${field}.description`)
							}}</template>
							<N8nIcon icon="info" size="xsmall" :class="$style.infoIcon" />
						</N8nTooltip>
					</div>

					<!-- Read-only defaults from the environment, collapsed by default -->
					<div
						v-if="baselineFor(field).length > 0"
						:class="$style.baseline"
						:data-test-id="`egress-baseline-${field}`"
					>
						<button
							type="button"
							:class="$style.baselineToggle"
							:aria-expanded="expandedBaseline[field]"
							:data-test-id="`egress-baseline-toggle-${field}`"
							@click.stop.prevent="toggleBaseline(field)"
						>
							<N8nIcon icon="lock" size="xsmall" />
							<N8nText size="small" color="text-light">{{
								i18n.baseText('settings.egressProtection.list.baselineSummary', {
									interpolate: { count: baselineFor(field).length },
								})
							}}</N8nText>
							<N8nIcon
								:icon="expandedBaseline[field] ? 'chevron-up' : 'chevron-down'"
								size="xsmall"
							/>
						</button>
						<div v-if="expandedBaseline[field]" :class="$style.baselineList">
							<N8nText
								v-for="(entry, index) in baselineFor(field)"
								:key="`baseline-${index}`"
								tag="div"
								size="small"
								color="text-light"
								:class="$style.baselineEntry"
								>{{ entry }}</N8nText
							>
						</div>
					</div>

					<!-- Editable override entries -->
					<div :class="$style.overrideRows" :data-test-id="`egress-override-${field}`">
						<div
							v-for="(entry, index) in overrideFor(field)"
							:key="`override-${index}`"
							:class="[$style.entryRow, $style[`entry_${listKind(field)}`]]"
						>
							<N8nIcon
								:icon="listKind(field) === 'allow' ? 'circle-check' : 'circle-x'"
								size="xsmall"
								:class="$style.entryIcon"
							/>
							<N8nText size="small" :class="$style.entryValue">{{ entry }}</N8nText>
							<N8nButton
								icon="trash-2"
								variant="ghost"
								size="small"
								native-type="button"
								:disabled="!editable"
								:aria-label="i18n.baseText('settings.egressProtection.list.remove')"
								:data-test-id="`egress-remove-${field}`"
								@click.stop.prevent="onRemoveEntry(field, index)"
							/>
						</div>

						<div
							v-if="overrideFor(field).length === 0 && baselineFor(field).length === 0"
							:class="$style.emptyHint"
						>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('settings.egressProtection.list.empty')
							}}</N8nText>
						</div>
					</div>

					<!-- Add new entry -->
					<div v-if="editable" :class="$style.addRow">
						<N8nInput
							v-model="newEntry[field]"
							size="small"
							:placeholder="i18n.baseText(`settings.egressProtection.list.${field}.placeholder`)"
							:data-test-id="`egress-input-${field}`"
							@keyup.enter="onAddEntry(field)"
						/>
						<N8nButton
							icon="plus"
							variant="subtle"
							size="small"
							native-type="button"
							:aria-label="i18n.baseText('settings.egressProtection.list.add')"
							:data-test-id="`egress-add-${field}`"
							@click.stop.prevent="onAddEntry(field)"
						/>
					</div>
				</div>
			</div>

			<!-- Precedence statement -->
			<N8nText size="small" color="text-light" :class="$style.precedence">
				{{ i18n.baseText('settings.egressProtection.precedence') }}
			</N8nText>

			<!-- Calibration -->
			<div :class="$style.calibrationHeader">
				<N8nHeading tag="h2" size="medium">
					{{ i18n.baseText('settings.egressProtection.calibration.title') }}
				</N8nHeading>
				<div :class="$style.calibrationActions">
					<N8nButton
						variant="outline"
						icon="refresh-cw"
						size="small"
						native-type="button"
						:loading="store.calibrationLoading"
						data-test-id="egress-calibration-refresh"
						@click.stop.prevent="refreshCalibration"
					>
						{{ i18n.baseText('settings.egressProtection.calibration.refresh') }}
					</N8nButton>
					<N8nButton
						v-if="editable"
						variant="outline"
						icon="trash-2"
						size="small"
						native-type="button"
						:disabled="calibrationDestinations.length === 0"
						data-test-id="egress-calibration-clear"
						@click.stop.prevent="clearCalibration"
					>
						{{ i18n.baseText('settings.egressProtection.calibration.clear') }}
					</N8nButton>
				</div>
			</div>
			<N8nText size="small" color="text-light" :class="$style.listDescription">
				{{ i18n.baseText('settings.egressProtection.calibration.description') }}
			</N8nText>

			<div :class="$style.card">
				<div
					v-if="calibrationDestinations.length === 0"
					:class="$style.emptyState"
					data-test-id="egress-calibration-empty"
				>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('settings.egressProtection.calibration.empty')
					}}</N8nText>
				</div>
				<table v-else :class="$style.table" data-test-id="egress-calibration-table">
					<thead>
						<tr>
							<th>{{ i18n.baseText('settings.egressProtection.calibration.column.hostname') }}</th>
							<th>
								{{ i18n.baseText('settings.egressProtection.calibration.column.resolvedIp') }}
							</th>
							<th>{{ i18n.baseText('settings.egressProtection.calibration.column.count') }}</th>
							<th>{{ i18n.baseText('settings.egressProtection.calibration.column.decision') }}</th>
							<th>{{ i18n.baseText('settings.egressProtection.calibration.column.lastSeen') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="(dest, index) in calibrationDestinations" :key="index">
							<td>{{ dest.hostname }}</td>
							<td>{{ dest.resolvedIp }}</td>
							<td>{{ dest.count }}</td>
							<td>
								<N8nBadge
									:theme="dest.decision === 'blocked' ? 'danger' : 'warning'"
									size="small"
									>{{ decisionLabel(dest.decision) }}</N8nBadge
								>
							</td>
							<td>{{ formatTimestamp(dest.lastSeen) }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--2xs);
}

.saveStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;

	&.saveStatus_saved {
		color: var(--color--success);
	}

	&.saveStatus_error {
		color: var(--color--danger);
	}
}

.description {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin: 0 0 var(--spacing--lg);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--color--text--tint-1);
}

.sectionHeading {
	display: block;
	margin: var(--spacing--lg) 0 var(--spacing--2xs);
}

.card {
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs) var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.settingsItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: 64px;
	padding: var(--spacing--xs) 0;
}

.settingsItemLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;

	label {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--medium);
		color: var(--color--text--shade-1);
	}

	small {
		font-size: var(--font-size--xs);
		font-weight: var(--font-weight--regular);
		line-height: var(--line-height--lg);
		color: var(--color--text--tint-1);
	}
}

.settingsItemControl {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;
}

// A coloured left edge on the mode card mirrors the status badge, so the active
// posture (observing vs enforcing) reads at a glance. `off` stays neutral.
.modeCard_log {
	border-left: 3px solid var(--border-color--warning);
}

.modeCard_enforce {
	border-left: 3px solid var(--border-color--success);
}

.modeStatus {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: fit-content;
	margin-top: var(--spacing--3xs);
}

// --- Allow/block matrix ---

.matrix {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}

.matrixHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--2xs) var(--spacing--4xs);
}

.cell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.cellTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--4xs);
}

.infoIcon {
	color: var(--color--text--tint-1);
	cursor: help;
}

.accent_allow {
	color: var(--icon-color--success);
}

.accent_block {
	color: var(--icon-color--danger);
}

// A coloured left edge identifies each cell (allow vs block) at a glance.
.cardAccent_allow {
	border-left: 3px solid var(--border-color--success);
}

.cardAccent_block {
	border-left: 3px solid var(--border-color--danger);
}

.precedence {
	display: block;
	margin: 0 0 var(--spacing--lg);
}

.listDescription {
	display: block;
	margin-bottom: var(--spacing--2xs);
}

.overrideRows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.baseline {
	margin-bottom: var(--spacing--3xs);
}

.baselineToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-1);

	&:hover {
		color: var(--color--text--shade-1);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
		border-radius: var(--radius--sm);
	}
}

.baselineList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--3xs) 0 var(--spacing--3xs) var(--spacing--sm);
	border-left: var(--border);
	margin-left: var(--spacing--4xs);
}

.baselineEntry {
	font-family: var(--font-family--monospace);
	word-break: break-all;
}

.entryRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--3xs);
	border: 1px solid transparent;
}

.entry_allow {
	background: var(--background--success);
	border-color: var(--border-color--success);
}

.entry_block {
	background: var(--background--danger);
	border-color: var(--border-color--danger);
}

.entryIcon {
	flex-shrink: 0;

	.entry_allow & {
		color: var(--icon-color--success);
	}

	.entry_block & {
		color: var(--icon-color--danger);
	}
}

.entryValue {
	flex: 1;
	min-width: 0;
	font-family: var(--font-family--monospace);
	word-break: break-all;
}

.emptyHint,
.emptyState {
	padding: var(--spacing--xs) 0;
}

.addRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
}

.calibrationHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin: var(--spacing--lg) 0 var(--spacing--2xs);
}

.calibrationActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--xs);

	th {
		text-align: left;
		padding: var(--spacing--2xs) var(--spacing--xs);
		color: var(--color--text--tint-1);
		font-weight: var(--font-weight--medium);
		border-bottom: var(--border);
	}

	td {
		padding: var(--spacing--2xs) var(--spacing--xs);
		color: var(--color--text--shade-1);
		border-bottom: var(--border);
		word-break: break-all;
	}

	tr:last-child td {
		border-bottom: none;
	}
}
</style>
