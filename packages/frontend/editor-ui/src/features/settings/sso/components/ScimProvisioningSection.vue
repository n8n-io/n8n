<script lang="ts" setup>
import type { ScimConfigResponse } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nCopyInput,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import * as scimApi from '@n8n/rest-api-client/api/scim';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ElSwitch } from 'element-plus';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
	/** SCIM works only while SAML or OIDC login is on. */
	ssoEnabled: boolean;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { showError } = useToast();

const config = ref<ScimConfigResponse | null>(null);
/** The backend returns the full token once. The page shows it until the user leaves. */
const newToken = ref<string | null>(null);
const saving = ref(false);
const showDisableDialog = ref(false);
const showRegenerateDialog = ref(false);

const enabled = computed(() => config.value?.enabled ?? false);

const toggleValue = computed({
	get: () => enabled.value,
	set: (value: boolean) => {
		if (value) void setEnabled(true);
		else showDisableDialog.value = true;
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

async function run(action: () => Promise<void>, errorTitle: string) {
	saving.value = true;
	try {
		await action();
	} catch (error) {
		showError(error, errorTitle);
	} finally {
		saving.value = false;
	}
}

async function load() {
	config.value = await scimApi.getScimConfig(rootStore.restApiContext);
}

async function setEnabled(value: boolean) {
	showDisableDialog.value = false;
	await run(async () => {
		await scimApi.setScimEnabled(rootStore.restApiContext, value);
		await load();
	}, i18n.baseText('settings.sso.scim.enable.error'));
}

async function generateToken() {
	showRegenerateDialog.value = false;
	await run(async () => {
		const { token } = await scimApi.generateScimToken(rootStore.restApiContext);
		newToken.value = token;
		await load();
	}, i18n.baseText('settings.sso.scim.token.error'));
}

function onGenerateClick() {
	if (config.value?.hasToken) showRegenerateDialog.value = true;
	else void generateToken();
}

onMounted(async () => {
	try {
		await load();
	} catch (error) {
		showError(error, i18n.baseText('settings.sso.scim.load.error'));
	}
});
</script>

<template>
	<N8nSettingsSection
		:title="i18n.baseText('settings.sso.scim.title')"
		:description="i18n.baseText('settings.sso.scim.description')"
		data-test-id="sso-scim-section"
	>
		<N8nSettingsRowGroup v-if="config">
			<N8nSettingsRow
				:title="i18n.baseText('settings.sso.scim.enable.title')"
				:description="
					props.ssoEnabled
						? i18n.baseText('settings.sso.scim.enable.description')
						: i18n.baseText('settings.sso.scim.enable.needsSso')
				"
			>
				<template #action>
					<ElSwitch
						v-model="toggleValue"
						size="large"
						:disabled="saving || (!props.ssoEnabled && !enabled)"
						data-test-id="sso-scim-toggle"
					/>
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
							:disabled="saving"
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
			:open="showDisableDialog"
			:title="i18n.baseText('settings.sso.scim.disable.title')"
			:description="i18n.baseText('settings.sso.scim.disable.description')"
			:action-label="i18n.baseText('settings.sso.scim.disable.action')"
			action-variant="destructive"
			@action="setEnabled(false)"
			@cancel="showDisableDialog = false"
			@update:open="showDisableDialog = $event"
		/>

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
.tokenAction {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.copyInput {
	width: 320px;
}
</style>
