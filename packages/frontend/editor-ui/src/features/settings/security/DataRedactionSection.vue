<script lang="ts" setup>
import { computed, ref, useCssModule } from 'vue';
import { ElSwitch } from 'element-plus';
import { I18nT } from 'vue-i18n';
import {
	N8nAlertDialog,
	N8nBadge,
	N8nHeading,
	N8nLink,
	N8nSelect2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type {
	SelectItemProps,
	SelectValue,
} from '@n8n/design-system/v2/components/Select/Select.types';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { RedactionFloor } from '@n8n/api-types';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { useToast } from '@/app/composables/useToast';
import {
	EnterpriseEditionFeature,
	EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL,
} from '@/app/constants';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

type EnforcedFloor = Exclude<RedactionFloor, 'off'>;

// Map the new floor enum to the existing i18n key suffixes so we don't
// churn translations. 'production' uses the legacy 'non-manual' suffix.
const FLOOR_TO_LEGACY_KEY: Record<EnforcedFloor, 'non-manual' | 'all'> = {
	production: 'non-manual',
	all: 'all',
};

const TOOLTIP_KEY = 'settings.security.dataRedaction.unlicensed_tooltip';

const props = defineProps<{
	initialFloor: RedactionFloor;
	managedByEnv: boolean;
}>();

const $style = useCssModule();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const pageRedirectionHelper = usePageRedirectionHelper();

const floor = ref<RedactionFloor>(props.initialFloor);
const showEnableDialog = ref(false);
const showDisableDialog = ref(false);
const isSaving = ref(false);

const isLicensed = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DataRedaction],
);

const enforced = computed({
	get: () => floor.value !== 'off',
	set: (value: boolean) => {
		if (value) {
			showEnableDialog.value = true;
			return;
		}
		showDisableDialog.value = true;
	},
});

const dropdownFloor = computed<EnforcedFloor>(() =>
	floor.value === 'off' ? 'production' : floor.value,
);

const floorOptions = computed<Array<SelectItemProps & { value: EnforcedFloor }>>(() =>
	(['production', 'all'] as EnforcedFloor[]).map((value) => ({
		value,
		label: i18n.baseText(
			`settings.security.dataRedaction.scope.option.${FLOOR_TO_LEGACY_KEY[value]}` as BaseTextKey,
		),
	})),
);

const affectedScopeText = computed(() => {
	if (floor.value === 'off') {
		return i18n.baseText('settings.security.dataRedaction.affectedScope.none');
	}
	return i18n.baseText(
		`settings.security.dataRedaction.affectedScope.${FLOOR_TO_LEGACY_KEY[floor.value]}` as BaseTextKey,
	);
});

async function persist(
	nextFloor: RedactionFloor,
	successKey: BaseTextKey,
	errorKey: BaseTextKey,
): Promise<boolean> {
	const previousFloor = floor.value;
	floor.value = nextFloor;
	isSaving.value = true;
	try {
		await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			redactionEnforcement: { floor: nextFloor },
		});
		showToast({
			type: 'success',
			title: i18n.baseText(successKey),
			message: '',
		});
		return true;
	} catch (error) {
		floor.value = previousFloor;
		showError(error, i18n.baseText(errorKey));
		return false;
	} finally {
		isSaving.value = false;
	}
}

async function confirmEnable() {
	const ok = await persist(
		'production',
		'settings.security.dataRedaction.enforce.success.enabled',
		'settings.security.dataRedaction.enforce.error',
	);
	if (ok) showEnableDialog.value = false;
}

async function confirmDisable() {
	const ok = await persist(
		'off',
		'settings.security.dataRedaction.enforce.success.disabled',
		'settings.security.dataRedaction.enforce.error',
	);
	if (ok) showDisableDialog.value = false;
}

function onSelectFloor(value: SelectValue | undefined) {
	if (!value) return;
	const next = value as EnforcedFloor;
	if (next === dropdownFloor.value) return;
	void persist(
		next,
		'settings.security.dataRedaction.scope.success',
		'settings.security.dataRedaction.scope.error',
	);
}

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('data-redaction', 'upgrade-data-redaction');
}
</script>

<template>
	<div>
		<div class="mb-s" :class="$style.headerTitle">
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('settings.security.dataRedaction.title') }}
			</N8nHeading>
			<N8nText color="text-base" size="small">{{
				i18n.baseText('settings.security.dataRedaction.description')
			}}</N8nText>
		</div>

		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true"
						>{{ i18n.baseText('settings.security.dataRedaction.enforce.title') }}
						<N8nBadge v-if="!isLicensed" class="ml-4xs">{{
							i18n.baseText('generic.upgrade')
						}}</N8nBadge>
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.dataRedaction.enforce.message') }}
						<N8nLink
							:to="EXECUTION_DATA_REDACTION_ENFORCEMENT_DOCS_URL"
							size="small"
							new-window
							data-test-id="redaction-enforcement-docs-link"
						>
							{{ i18n.baseText('generic.learnMore') }}
						</N8nLink>
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<EnterpriseEdition :features="[EnterpriseEditionFeature.DataRedaction]">
						<ElSwitch
							v-model="enforced"
							size="large"
							:disabled="props.managedByEnv || isSaving"
							data-test-id="enable-redaction-enforcement"
						/>
						<template #fallback>
							<N8nTooltip>
								<ElSwitch
									:model-value="enforced"
									size="large"
									:disabled="true"
									data-test-id="enable-redaction-enforcement"
								/>
								<template #content>
									<I18nT :keypath="TOOLTIP_KEY" tag="span" scope="global">
										<template #action>
											<a @click="goToUpgrade">
												{{
													i18n.baseText('settings.security.dataRedaction.unlicensed_tooltip.link')
												}}
											</a>
										</template>
									</I18nT>
								</template>
							</N8nTooltip>
						</template>
					</EnterpriseEdition>
				</div>
			</div>
			<div
				v-if="!isLicensed || enforced"
				:class="$style.settingsContainer"
				data-test-id="redaction-enforcement-scope-row"
			>
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true"
						>{{ i18n.baseText('settings.security.dataRedaction.scope.title') }}
						<N8nBadge v-if="!isLicensed" class="ml-4xs">{{
							i18n.baseText('generic.upgrade')
						}}</N8nBadge>
					</N8nText>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('settings.security.dataRedaction.scope.description')
					}}</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<EnterpriseEdition :features="[EnterpriseEditionFeature.DataRedaction]">
						<N8nSelect2
							:model-value="dropdownFloor"
							:items="floorOptions"
							size="medium"
							:disabled="props.managedByEnv || isSaving"
							data-test-id="redaction-enforcement-scope-select"
							@update:model-value="onSelectFloor"
						/>
						<template #fallback>
							<N8nTooltip>
								<N8nSelect2
									:model-value="dropdownFloor"
									:items="floorOptions"
									size="medium"
									:disabled="true"
									data-test-id="redaction-enforcement-scope-select"
								/>
								<template #content>
									<I18nT :keypath="TOOLTIP_KEY" tag="span" scope="global">
										<template #action>
											<a @click="goToUpgrade">
												{{
													i18n.baseText('settings.security.dataRedaction.unlicensed_tooltip.link')
												}}
											</a>
										</template>
									</I18nT>
								</template>
							</N8nTooltip>
						</template>
					</EnterpriseEdition>
				</div>
			</div>
			<div :class="$style.settingsCountRow" data-test-id="redaction-enforcement-summary">
				<N8nText size="small">
					{{ i18n.baseText('settings.security.dataRedaction.affectedScope.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ affectedScopeText }}
				</N8nText>
			</div>
		</div>

		<N8nAlertDialog
			:open="showEnableDialog"
			:title="i18n.baseText('settings.security.dataRedaction.enforce.confirmEnable.headline')"
			:description="i18n.baseText('settings.security.dataRedaction.enforce.confirmEnable.message')"
			:action-label="i18n.baseText('settings.security.dataRedaction.enforce.confirmEnable.action')"
			:loading="isSaving"
			size="medium"
			data-test-id="redaction-enforcement-enable-confirm"
			@action="confirmEnable"
			@cancel="showEnableDialog = false"
			@update:open="showEnableDialog = $event"
		/>

		<N8nAlertDialog
			:open="showDisableDialog"
			:title="i18n.baseText('settings.security.dataRedaction.enforce.confirmDisable.headline')"
			:description="i18n.baseText('settings.security.dataRedaction.enforce.confirmDisable.message')"
			:action-label="i18n.baseText('settings.security.dataRedaction.enforce.confirmDisable.action')"
			:loading="isSaving"
			size="medium"
			data-test-id="redaction-enforcement-disable-confirm"
			@action="confirmDisable"
			@cancel="showDisableDialog = false"
			@update:open="showDisableDialog = $event"
		/>
	</div>
</template>

<style module>
.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.settingsSection {
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--xl);
	background-color: light-dark(var(--color--neutral-white), transparent);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--2xs) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--md) var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.settingsCountRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
