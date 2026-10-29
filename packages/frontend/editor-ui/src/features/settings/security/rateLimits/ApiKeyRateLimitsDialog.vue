<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type {
	PublicApiRateLimitSettings,
	PublicApiRateLimitSettingsResponse,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	RATE_LIMIT_GROUPS,
	RATE_LIMIT_GROUP_KEYS,
	RATE_LIMIT_ROW_KEYS,
	exceedsAllEndpointsLimit,
	parseInputs,
	getRowError,
	hasNoLimits,
	toInputs,
	type RateLimitInputs,
	type RateLimitGroup,
	type RateLimitRowKey,
} from './rateLimits';

const props = defineProps<{
	open: boolean;
	mode: 'enable' | 'edit';
	settings: PublicApiRateLimitSettings;
	defaults: PublicApiRateLimitSettingsResponse['defaults'];
	envManagedFields: Array<keyof PublicApiRateLimitSettings>;
	saving: boolean;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	save: [settings: PublicApiRateLimitSettings];
}>();

const i18n = useI18n();

const inputs = ref<RateLimitInputs>(toInputs(props.settings));
const touchedRows = ref(new Set<RateLimitRowKey>());
const submitted = ref(false);

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		inputs.value = toInputs(props.settings);
		touchedRows.value = new Set();
		submitted.value = false;
	},
);

const groups = RATE_LIMIT_GROUP_KEYS.map((group) => ({ group, rows: RATE_LIMIT_GROUPS[group] }));

const isLimitLocked = (key: RateLimitRowKey) => props.envManagedFields.includes(`${key}Limit`);
const isWindowLocked = (key: RateLimitRowKey) =>
	props.envManagedFields.includes(`${key}WindowSeconds`);

function rowErrorText(key: RateLimitRowKey) {
	if (!submitted.value && !touchedRows.value.has(key)) return undefined;
	const error = getRowError(inputs.value[key]);
	return error && i18n.baseText(`settings.security.rateLimits.dialog.error.${error}`);
}

function fieldLabel(field: 'limit' | 'window', group: RateLimitGroup, kind: 'read' | 'write') {
	return i18n.baseText(`settings.security.rateLimits.dialog.${field}.label`, {
		interpolate: {
			group: i18n.baseText(`settings.security.rateLimits.group.${group}`),
			kind: i18n.baseText(`settings.security.rateLimits.dialog.${kind}`),
		},
	});
}

const rowWarning = (key: RateLimitRowKey) =>
	(key === 'endpointRead' || key === 'endpointWrite') &&
	exceedsAllEndpointsLimit(inputs.value, key);

const defaultInputs = computed(() => toInputs(props.defaults));

const canReset = (key: RateLimitRowKey) =>
	(!isLimitLocked(key) && inputs.value[key].limit !== defaultInputs.value[key].limit) ||
	(!isWindowLocked(key) && inputs.value[key].window !== defaultInputs.value[key].window);

const hasErrors = computed(() =>
	RATE_LIMIT_ROW_KEYS.some((key) => getRowError(inputs.value[key]) !== undefined),
);
const isEmpty = computed(() => hasNoLimits(inputs.value));
const showFixMessage = computed(() => submitted.value && hasErrors.value);
const isEnabledLocked = computed(() => props.envManagedFields.includes('enabled'));
const canDisable = computed(() => props.mode === 'edit' && !isEnabledLocked.value);
const willDisable = computed(() => canDisable.value && isEmpty.value && !hasErrors.value);

const title = computed(() =>
	props.mode === 'enable'
		? i18n.baseText('settings.security.rateLimits.dialog.enable.title')
		: i18n.baseText('settings.security.rateLimits.dialog.edit.title'),
);

const primaryLabel = computed(() => {
	if (props.mode === 'enable') {
		return i18n.baseText('settings.security.rateLimits.dialog.enable.button');
	}
	return willDisable.value
		? i18n.baseText('settings.security.rateLimits.dialog.disable')
		: i18n.baseText('settings.security.rateLimits.dialog.save');
});

const isPrimaryDisabled = computed(() => !canDisable.value && isEmpty.value && !hasErrors.value);

function resetText(key: RateLimitRowKey) {
	const limit = Number(
		isLimitLocked(key) ? inputs.value[key].limit : defaultInputs.value[key].limit,
	);
	if (!limit) return i18n.baseText('settings.security.rateLimits.dialog.noLimit');
	const window = Number(
		isWindowLocked(key) ? inputs.value[key].window : defaultInputs.value[key].window,
	);
	return i18n.baseText('settings.security.rateLimits.dialog.defaultValue', {
		interpolate: { limit: limit.toLocaleString(), window: window.toLocaleString() },
	});
}

function resetRow(key: RateLimitRowKey) {
	if (!isLimitLocked(key)) inputs.value[key].limit = defaultInputs.value[key].limit;
	if (!isWindowLocked(key)) inputs.value[key].window = defaultInputs.value[key].window;
}

function resetAll() {
	for (const key of RATE_LIMIT_ROW_KEYS) if (canReset(key)) resetRow(key);
}

function save() {
	submitted.value = true;
	if (hasErrors.value) return;
	emit('save', { ...parseInputs(inputs.value, props.settings), enabled: !isEmpty.value });
}
</script>

<template>
	<N8nDialog
		:open="open"
		:header="title"
		size="medium"
		data-test-id="rate-limits-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogBody>
			<N8nDialogDescription>
				{{ i18n.baseText('settings.security.rateLimits.dialog.description') }}
			</N8nDialogDescription>
			<div :class="$style.groups">
				<div v-for="{ group, rows } in groups" :key="group" :class="$style.group">
					<div :class="$style.groupTitle">
						<N8nText :bold="true">
							{{ i18n.baseText(`settings.security.rateLimits.group.${group}`) }}
						</N8nText>
						<N8nTooltip
							:content="i18n.baseText(`settings.security.rateLimits.group.${group}.tooltip`)"
						>
							<N8nIcon icon="info" size="small" color="text-light" />
						</N8nTooltip>
					</div>

					<div v-for="kind in ['read', 'write'] as const" :key="kind" :class="$style.rowWrapper">
						<div :class="$style.row">
							<N8nText :class="$style.rowLabel">
								{{ i18n.baseText(`settings.security.rateLimits.dialog.${kind}`) }}
							</N8nText>
							<div :class="$style.field">
								<N8nTooltip
									:disabled="!isLimitLocked(rows[kind])"
									:content="i18n.baseText('settings.security.rateLimits.envLocked.field')"
								>
									<N8nInput
										v-model="inputs[rows[kind]].limit"
										size="medium"
										inputmode="numeric"
										:placeholder="i18n.baseText('settings.security.rateLimits.dialog.noLimit')"
										:aria-label="fieldLabel('limit', group, kind)"
										:disabled="isLimitLocked(rows[kind])"
										:data-test-id="`rate-limits-limit-${rows[kind]}`"
										@blur="touchedRows.add(rows[kind])"
									/>
								</N8nTooltip>
							</div>
							<N8nText color="text-light" size="small" :class="$style.requestsPer">
								{{ i18n.baseText('settings.security.rateLimits.dialog.requestsPer') }}
							</N8nText>
							<div :class="$style.field">
								<N8nTooltip
									:disabled="!isWindowLocked(rows[kind])"
									:content="i18n.baseText('settings.security.rateLimits.envLocked.field')"
								>
									<N8nInput
										v-model="inputs[rows[kind]].window"
										size="medium"
										inputmode="numeric"
										:aria-label="fieldLabel('window', group, kind)"
										:disabled="isWindowLocked(rows[kind])"
										:data-test-id="`rate-limits-window-${rows[kind]}`"
										@blur="touchedRows.add(rows[kind])"
									>
										<template #suffix>
											{{ i18n.baseText('settings.security.rateLimits.dialog.seconds') }}
										</template>
									</N8nInput>
								</N8nTooltip>
							</div>
							<div :class="$style.resetSlot">
								<N8nTooltip
									v-if="canReset(rows[kind])"
									:content="
										i18n.baseText('settings.security.rateLimits.dialog.reset', {
											interpolate: { value: resetText(rows[kind]) },
										})
									"
								>
									<N8nButton
										variant="ghost"
										size="small"
										icon-only
										:aria-label="
											i18n.baseText('settings.security.rateLimits.dialog.reset', {
												interpolate: { value: resetText(rows[kind]) },
											})
										"
										:data-test-id="`rate-limits-reset-${rows[kind]}`"
										@click="resetRow(rows[kind])"
									>
										<N8nIcon icon="undo-2" />
									</N8nButton>
								</N8nTooltip>
							</div>
						</div>
						<N8nText
							v-if="rowErrorText(rows[kind])"
							size="small"
							color="danger"
							:class="$style.message"
							:data-test-id="`rate-limits-error-${rows[kind]}`"
						>
							{{ rowErrorText(rows[kind]) }}
						</N8nText>
						<N8nText
							v-else-if="rowWarning(rows[kind])"
							size="small"
							color="warning"
							:class="$style.message"
							:data-test-id="`rate-limits-warning-${rows[kind]}`"
						>
							{{ i18n.baseText('settings.security.rateLimits.dialog.warning.neverApplies') }}
						</N8nText>
					</div>
				</div>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<div :class="$style.footer">
				<div :class="$style.footerStart">
					<N8nButton
						v-if="RATE_LIMIT_ROW_KEYS.some(canReset)"
						variant="ghost"
						size="small"
						:label="i18n.baseText('settings.security.rateLimits.dialog.resetAll')"
						data-test-id="rate-limits-reset-all"
						@click="resetAll"
					/>
					<N8nText v-if="showFixMessage" size="small" color="danger">
						{{ i18n.baseText('settings.security.rateLimits.dialog.error.fix') }}
					</N8nText>
					<N8nText v-else-if="willDisable" size="small" color="text-light">
						{{ i18n.baseText('settings.security.rateLimits.dialog.disableNote') }}
					</N8nText>
				</div>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('settings.security.rateLimits.dialog.cancel')"
					data-test-id="rate-limits-cancel"
					@click="emit('update:open', false)"
				/>
				<N8nTooltip
					:disabled="!isPrimaryDisabled"
					:content="i18n.baseText('settings.security.rateLimits.dialog.enableTooltip')"
				>
					<N8nButton
						:label="primaryLabel"
						:disabled="isPrimaryDisabled"
						:loading="saving"
						data-test-id="rate-limits-save"
						@click="save"
					/>
				</N8nTooltip>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-top: var(--spacing--sm);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.groupTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.rowWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.row {
	display: grid;
	grid-template-columns: var(--spacing--3xl) minmax(0, 3fr) auto minmax(0, 2fr) var(--spacing--xl);
	align-items: center;
	gap: var(--spacing--2xs);
}

.rowLabel,
.requestsPer {
	white-space: nowrap;
}

.field {
	min-width: 0;

	> * {
		width: 100%;
	}
}

.resetSlot {
	display: flex;
	justify-content: center;
}

.message {
	padding-left: calc(var(--spacing--3xl) + var(--spacing--2xs));
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.footerStart {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-right: auto;
}
</style>
