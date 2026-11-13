<script lang="ts" setup>
import type { ScimConfigResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nCopyInput,
	N8nHeading,
	N8nOption,
	N8nPreviewBadge,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import * as scimApi from '@n8n/rest-api-client/api/scim';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps<{
	/** SCIM works only while SAML or OIDC login is on. */
	ssoEnabled: boolean;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { showError } = useToast();

const config = ref<ScimConfigResponse | null>(null);
/** The value in the select. The SSO page saves it with its other settings. */
const selectedEnabled = ref(false);
/** The backend returns the full token once. The page shows it until the user leaves. */
const newToken = ref<string | null>(null);
const saving = ref(false);
const generatingToken = ref(false);
const showRegenerateDialog = ref(false);

const hasUnsavedChanges = computed(
	() => config.value !== null && selectedEnabled.value !== config.value.enabled,
);

const selectValue = computed({
	get: () => (selectedEnabled.value ? 'enabled' : 'disabled'),
	set: (value: string) => {
		selectedEnabled.value = value === 'enabled';
	},
});

const tokenDescription = computed(() => {
	if (newToken.value) return i18n.baseText('settings.sso.scim.token.copyNow');
	if (config.value?.hasToken) {
		return i18n.baseText('settings.sso.scim.token.exists', {
			interpolate: { hint: config.value.tokenHint ?? '' },
		});
	}
	return i18n.baseText('settings.sso.scim.token.none');
});

async function load() {
	try {
		config.value = await scimApi.getScimConfig(rootStore.restApiContext);
		selectedEnabled.value = config.value.enabled;
	} catch (error) {
		showError(error, i18n.baseText('settings.sso.scim.load.error'));
	}
}

/** Saves the select value. Returns false when the save fails. */
async function save(): Promise<boolean> {
	if (!config.value || !hasUnsavedChanges.value) return true;
	saving.value = true;
	try {
		// The response carries the new state, so the page does not load the config again.
		const { enabled } = await scimApi.setScimEnabled(
			rootStore.restApiContext,
			selectedEnabled.value,
		);
		config.value = { ...config.value, enabled };
		selectedEnabled.value = enabled;
		return true;
	} catch (error) {
		showError(error, i18n.baseText('settings.sso.scim.enable.error'));
		return false;
	} finally {
		saving.value = false;
	}
}

function discard() {
	if (config.value) selectedEnabled.value = config.value.enabled;
}

async function generateToken() {
	showRegenerateDialog.value = false;
	generatingToken.value = true;
	try {
		const { token } = await scimApi.generateScimToken(rootStore.restApiContext);
		newToken.value = token;
		if (config.value)
			config.value = { ...config.value, hasToken: true, tokenHint: token.slice(-4) };
	} catch (error) {
		showError(error, i18n.baseText('settings.sso.scim.token.error'));
	} finally {
		generatingToken.value = false;
	}
}

function onGenerateClick() {
	if (config.value?.hasToken) showRegenerateDialog.value = true;
	else void generateToken();
}

// The SSO page saves and discards SCIM with the SAML and OIDC settings.
defineExpose({ hasUnsavedChanges, saving, save, discard, reload: load });

onMounted(load);

// Turning single sign-on off also turns SCIM off on the backend.
watch(
	() => props.ssoEnabled,
	async () => await load(),
);
</script>

<template>
	<N8nSettingsSection
		:description="i18n.baseText('settings.sso.scim.description')"
		data-test-id="sso-scim-section"
	>
		<template #title>
			<div :class="$style.titleRow">
				<N8nHeading tag="h2" step="md" color="text-dark">
					{{ i18n.baseText('settings.sso.scim.title') }}
				</N8nHeading>
				<N8nPreviewBadge size="xsmall" data-test-id="sso-scim-preview-badge" />
			</div>
		</template>
		<N8nSettingsRowGroup v-if="config">
			<N8nSettingsRow
				:title="i18n.baseText('settings.sso.scim.enable.title')"
				:description="i18n.baseText('settings.sso.scim.enable.description')"
			>
				<template #action>
					<N8nTooltip
						:disabled="props.ssoEnabled"
						:content="i18n.baseText('settings.sso.scim.enable.needsSso')"
						placement="top"
					>
						<!-- A disabled select gets no pointer events, so the wrapper shows the tooltip. -->
						<div :class="$style.selectWrapper" data-test-id="sso-scim-enabled-select-wrapper">
							<N8nSelect
								v-model="selectValue"
								size="medium"
								:class="$style.select"
								:disabled="saving || !props.ssoEnabled"
								:aria-label="i18n.baseText('settings.sso.scim.enable.title')"
								data-test-id="sso-scim-enabled-select"
							>
								<N8nOption
									value="enabled"
									:label="i18n.baseText('settings.sso.settings.ssoToggle.enabled')"
									data-test-id="sso-scim-enabled-option"
								/>
								<N8nOption
									value="disabled"
									:label="i18n.baseText('settings.sso.settings.ssoToggle.disabled')"
									data-test-id="sso-scim-enabled-option"
								/>
							</N8nSelect>
						</div>
					</N8nTooltip>
				</template>
			</N8nSettingsRow>

			<N8nSettingsRow
				:title="i18n.baseText('settings.sso.scim.baseUrl.title')"
				:description="i18n.baseText('settings.sso.scim.baseUrl.description')"
			>
				<template #action>
					<N8nCopyInput
						:class="$style.copyInput"
						:value="config.baseUrl"
						:label="i18n.baseText('settings.sso.scim.baseUrl.title')"
						size="medium"
						data-test-id="sso-scim-base-url"
					/>
				</template>
			</N8nSettingsRow>

			<N8nSettingsRow
				:title="i18n.baseText('settings.sso.scim.token.title')"
				:description="tokenDescription"
			>
				<template #action>
					<div :class="$style.tokenAction">
						<N8nCopyInput
							v-if="newToken"
							:class="$style.copyInput"
							:value="newToken"
							:label="i18n.baseText('settings.sso.scim.token.title')"
							size="medium"
							redact
							data-test-id="sso-scim-token"
						/>
						<N8nButton
							:variant="config.hasToken ? 'outline' : 'solid'"
							:disabled="generatingToken"
							data-test-id="sso-scim-generate-token"
							@click="onGenerateClick"
						>
							{{
								config.hasToken
									? i18n.baseText('settings.sso.scim.token.regenerate')
									: i18n.baseText('settings.sso.scim.token.generate')
							}}
						</N8nButton>
					</div>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>

		<N8nAlertDialog
			:open="showRegenerateDialog"
			:title="i18n.baseText('settings.sso.scim.regenerate.title')"
			:description="i18n.baseText('settings.sso.scim.regenerate.description')"
			:action-label="i18n.baseText('settings.sso.scim.token.regenerate')"
			action-variant="destructive"
			@action="generateToken"
			@cancel="showRegenerateDialog = false"
			@update:open="showRegenerateDialog = $event"
		/>
	</N8nSettingsSection>
</template>

<style lang="scss" module>
.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.selectWrapper {
	display: inline-flex;
}

.select {
	width: 200px;
}

.tokenAction {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.copyInput {
	width: 320px;
}
</style>
