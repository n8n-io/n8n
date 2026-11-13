<script lang="ts" setup>
import type { ScimConfigResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nCopyInput,
	N8nDropdownMenu,
	N8nHeading,
	N8nIconButton,
	N8nOption,
	N8nPreviewBadge,
	N8nSelect,
	N8nSettingsSection,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import * as scimApi from '@n8n/rest-api-client/api/scim';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';

import { maskSecret, maskSecretParts } from '@/app/utils/maskSecret';

/** Every SCIM token starts with this prefix, so the UI can show it unmasked. */
const SCIM_TOKEN_PREFIX = 'n8n_scim_';

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

/** The token with its middle hidden. Null while there is no token. */
const maskedToken = computed(() => {
	if (newToken.value) return maskSecret(newToken.value, SCIM_TOKEN_PREFIX.length);
	if (config.value?.hasToken && config.value.tokenHint) {
		return maskSecretParts(SCIM_TOKEN_PREFIX, config.value.tokenHint);
	}
	return null;
});

const tokenDescription = computed(() => {
	if (newToken.value) return i18n.baseText('settings.sso.scim.token.copyNow');
	if (maskedToken.value) return i18n.baseText('settings.sso.scim.token.active');
	if (config.value?.enabled) return i18n.baseText('settings.sso.scim.token.none');
	return i18n.baseText('settings.sso.scim.token.createdOnEnable');
});

const tokenMenuItems = computed(() => [
	{
		id: 'rotate',
		label: i18n.baseText('settings.sso.scim.token.rotate'),
		icon: { type: 'icon' as const, value: 'refresh-cw' as const },
		testId: 'sso-scim-token-rotate',
	},
]);

function onTokenMenu(action: string) {
	if (action === 'rotate') showRegenerateDialog.value = true;
}

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
		// The identity provider needs a token, so turning SCIM on creates the first one.
		if (enabled && !config.value.hasToken) await generateToken();
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
		<!-- The same card and row containers as the SAML and OIDC settings above, so the sizes match. -->
		<div v-if="config" :class="shared.card">
			<div :class="shared.settingsItem">
				<div :class="shared.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.scim.enable.title') }}</label>
					<small>{{ i18n.baseText('settings.sso.scim.enable.description') }}</small>
				</div>
				<div :class="shared.settingsItemControl">
					<N8nTooltip
						as-child
						:disabled="props.ssoEnabled"
						:content="i18n.baseText('settings.sso.scim.enable.needsSso')"
						placement="top"
					>
						<!-- A disabled select gets no pointer events, so the wrapper shows the tooltip. -->
						<div :class="$style.selectWrapper" data-test-id="sso-scim-enabled-select-wrapper">
							<N8nSelect
								v-model="selectValue"
								size="medium"
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
				</div>
			</div>

			<div :class="shared.settingsItem">
				<div :class="shared.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.scim.baseUrl.title') }}</label>
					<small>{{ i18n.baseText('settings.sso.scim.baseUrl.description') }}</small>
				</div>
				<div :class="shared.settingsItemControl">
					<N8nCopyInput
						:value="config.baseUrl"
						:label="i18n.baseText('settings.sso.scim.baseUrl.title')"
						size="medium"
						data-test-id="sso-scim-base-url"
					/>
				</div>
			</div>

			<div :class="shared.settingsItem">
				<div :class="shared.settingsItemLabel">
					<label>{{ i18n.baseText('settings.sso.scim.token.title') }}</label>
					<small>{{ tokenDescription }}</small>
				</div>
				<div :class="shared.settingsItemControl">
					<div v-if="maskedToken" :class="$style.tokenAction">
						<!-- The full token is only known right after it is created, so only then it can be copied. -->
						<N8nCopyInput
							:class="$style.tokenInput"
							:value="newToken ?? maskedToken"
							:display-value="maskedToken"
							:allow-copy="newToken !== null"
							:label="i18n.baseText('settings.sso.scim.token.title')"
							size="medium"
							redact
							data-test-id="sso-scim-token"
						/>
						<N8nDropdownMenu
							:items="tokenMenuItems"
							placement="bottom-end"
							data-test-id="sso-scim-token-menu"
							@select="onTokenMenu"
						>
							<template #trigger>
								<N8nIconButton
									variant="ghost"
									size="medium"
									icon="ellipsis"
									:disabled="generatingToken"
									:aria-label="i18n.baseText('settings.sso.scim.token.actions')"
									data-test-id="sso-scim-token-menu-trigger"
								/>
							</template>
						</N8nDropdownMenu>
					</div>
					<N8nButton
						v-else-if="config.enabled"
						:disabled="generatingToken"
						data-test-id="sso-scim-generate-token"
						@click="generateToken"
					>
						{{ i18n.baseText('settings.sso.scim.token.generate') }}
					</N8nButton>
				</div>
			</div>
		</div>

		<N8nAlertDialog
			:open="showRegenerateDialog"
			:title="i18n.baseText('settings.sso.scim.regenerate.title')"
			:description="i18n.baseText('settings.sso.scim.regenerate.description')"
			:action-label="i18n.baseText('settings.sso.scim.token.rotate')"
			action-variant="destructive"
			@action="generateToken"
			@cancel="showRegenerateDialog = false"
			@update:open="showRegenerateDialog = $event"
		/>
	</N8nSettingsSection>
</template>

<style lang="scss" module="shared" src="../styles/sso-form.module.scss" />

<style lang="scss" module>
.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

/* The shared control is a flex row, so these wrappers fill it and pass the width on. */
.selectWrapper {
	display: flex;
	width: 100%;

	> * {
		flex: 1 1 auto;
	}
}

/* The token field takes the room that the menu button leaves in the control. */
.tokenAction {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
}

.tokenInput {
	flex: 1 1 auto;
	min-width: 0;
}
</style>
