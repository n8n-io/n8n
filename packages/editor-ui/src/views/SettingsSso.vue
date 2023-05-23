<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { useSSOStore } from '@/stores/sso.store';
import { useUIStore } from '@/stores/ui.store';
import CopyInput from '@/components/CopyInput.vue';
import { useI18n, useMessage, useToast } from '@/composables';

const IdentityProviderSettingsType = {
	URL: 'url',
	XML: 'xml',
};

const { i18n } = useI18n();
const ssoStore = useSSOStore();
const uiStore = useUIStore();
const message = useMessage();
const toast = useToast();

const ssoActivatedLabel = computed(() =>
	ssoStore.isSamlLoginEnabled
		? i18n.baseText('settings.sso.activated')
		: i18n.baseText('settings.sso.deactivated'),
);
const ssoSettingsSaved = ref(false);

const redirectUrl = ref();
const entityId = ref();

const ipsOptions = ref([
	{
		label: i18n.baseText('settings.sso.settings.ips.options.url'),
		value: IdentityProviderSettingsType.URL,
	},
	{
		label: i18n.baseText('settings.sso.settings.ips.options.xml'),
		value: IdentityProviderSettingsType.XML,
	},
]);
const ipsType = ref(IdentityProviderSettingsType.URL);

const metadataUrl = ref();
const metadata = ref();

const isSaveEnabled = computed(() => {
	if (ipsType.value === IdentityProviderSettingsType.URL) {
		return !!metadataUrl.value && metadataUrl.value !== ssoStore.samlConfig?.metadataUrl;
	} else if (ipsType.value === IdentityProviderSettingsType.XML) {
		return !!metadata.value && metadata.value !== ssoStore.samlConfig?.metadata;
	}
	return false;
});

const isTestEnabled = computed(() => {
	if (ipsType.value === IdentityProviderSettingsType.URL) {
		return !!metadataUrl.value && ssoSettingsSaved.value;
	} else if (ipsType.value === IdentityProviderSettingsType.XML) {
		return !!metadata.value && ssoSettingsSaved.value;
	}
	return false;
});

const getSamlConfig = async () => {
	const config = await ssoStore.getSamlConfig();

	entityId.value = config?.entityID;
	redirectUrl.value = config?.returnUrl;

	if (config?.metadataUrl) {
		ipsType.value = IdentityProviderSettingsType.URL;
	} else if (config?.metadata) {
		ipsType.value = IdentityProviderSettingsType.XML;
	}

	metadata.value = config?.metadata;
	metadataUrl.value = config?.metadataUrl;
	ssoSettingsSaved.value = !!config?.metadata;
};

const onSave = async () => {
	try {
		const config =
			ipsType.value === IdentityProviderSettingsType.URL
				? { metadataUrl: metadataUrl.value }
				: { metadata: metadata.value };
		await ssoStore.saveSamlConfig(config);

		if (!ssoStore.isSamlLoginEnabled) {
			const answer = await message.confirm(
				i18n.baseText('settings.sso.settings.save.activate.message'),
				i18n.baseText('settings.sso.settings.save.activate.title'),
				{
					confirmButtonText: i18n.baseText('settings.sso.settings.save.activate.test'),
					cancelButtonText: i18n.baseText('settings.sso.settings.save.activate.cancel'),
				},
			);

			if (answer === 'confirm') {
				await onTest();
			}
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.sso.settings.save.error'));
		return;
	} finally {
		await getSamlConfig();
	}
};

const onTest = async () => {
	try {
		const url = await ssoStore.testSamlConfig();

		if (typeof window !== 'undefined') {
			window.open(url, '_blank');
		}
	} catch (error) {
		toast.showError(error, 'error');
	}
};

const goToUpgrade = () => {
	uiStore.goToUpgrade('sso', 'upgrade-sso');
};

onMounted(async () => {
	if (!ssoStore.isEnterpriseSamlEnabled) {
		return;
	}
	try {
		await getSamlConfig();
	} catch (error) {
		toast.showError(error, 'error');
	}
});
</script>

<template>
	<div>
		<n8n-heading size="2xlarge">{{ i18n.baseText('settings.sso.title') }}</n8n-heading>
		<div :class="$style.top">
			<n8n-heading size="xlarge">{{ i18n.baseText('settings.sso.subtitle') }}</n8n-heading>
			<n8n-tooltip
				v-if="ssoStore.isEnterpriseSamlEnabled"
				:disabled="ssoStore.isSamlLoginEnabled || ssoSettingsSaved"
			>
				<template #content>
					<span>
						{{ i18n.baseText('settings.sso.activation.tooltip') }}
					</span>
				</template>
				<el-switch
					v-model="ssoStore.isSamlLoginEnabled"
					:disabled="!ssoSettingsSaved"
					:class="$style.switch"
					:inactive-text="ssoActivatedLabel"
				/>
			</n8n-tooltip>
		</div>
		<n8n-info-tip>
			{{ i18n.baseText('settings.sso.info') }}
			<a href="https://docs.n8n.io/user-management/saml/" target="_blank">
				{{ i18n.baseText('settings.sso.info.link') }}
			</a>
		</n8n-info-tip>
		<div v-if="ssoStore.isEnterpriseSamlEnabled" data-test-id="sso-content-licensed">
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.redirectUrl.label') }}</label>
				<CopyInput
					:value="redirectUrl"
					:copy-button-text="i18n.baseText('generic.clickToCopy')"
					:toast-title="i18n.baseText('settings.sso.settings.redirectUrl.copied')"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.redirectUrl.help') }}</small>
			</div>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.entityId.label') }}</label>
				<CopyInput
					:value="entityId"
					:copy-button-text="i18n.baseText('generic.clickToCopy')"
					:toast-title="i18n.baseText('settings.sso.settings.entityId.copied')"
				/>
				<small>{{ i18n.baseText('settings.sso.settings.entityId.help') }}</small>
			</div>
			<div :class="$style.group">
				<label>{{ i18n.baseText('settings.sso.settings.ips.label') }}</label>
				<div class="mt-2xs mb-s">
					<n8n-radio-buttons :options="ipsOptions" v-model="ipsType" />
				</div>
				<div v-show="ipsType === IdentityProviderSettingsType.URL">
					<n8n-input
						v-model="metadataUrl"
						type="text"
						name="metadataUrl"
						size="large"
						:placeholder="i18n.baseText('settings.sso.settings.ips.url.placeholder')"
					/>
					<small>{{ i18n.baseText('settings.sso.settings.ips.url.help') }}</small>
				</div>
				<div v-show="ipsType === IdentityProviderSettingsType.XML">
					<n8n-input v-model="metadata" type="textarea" name="metadata" :rows="4" />
					<small>{{ i18n.baseText('settings.sso.settings.ips.xml.help') }}</small>
				</div>
			</div>
			<div :class="$style.buttons">
				<n8n-button :disabled="!isSaveEnabled" @click="onSave" data-test-id="sso-save">
					{{ i18n.baseText('settings.sso.settings.save') }}
				</n8n-button>
				<n8n-button
					:disabled="!isTestEnabled"
					type="tertiary"
					@click="onTest"
					data-test-id="sso-test"
				>
					{{ i18n.baseText('settings.sso.settings.test') }}
				</n8n-button>
			</div>
			<footer :class="$style.footer">
				{{ i18n.baseText('settings.sso.settings.footer.hint') }}
			</footer>
		</div>
		<n8n-action-box
			v-else
			data-test-id="sso-content-unlicensed"
			:class="$style.actionBox"
			:description="i18n.baseText('settings.sso.actionBox.description')"
			:buttonText="i18n.baseText('settings.sso.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.sso.actionBox.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
</template>

<style lang="scss" module>
.top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-2xl) 0 var(--spacing-xl);
}

.switch {
	span {
		font-size: var(--font-size-2xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-light);
	}
}

.buttons {
	display: flex;
	justify-content: flex-start;
	padding: var(--spacing-2xl) 0 var(--spacing-2xs);

	button {
		margin: 0 var(--spacing-s) 0 0;
	}
}

.group {
	padding: var(--spacing-xl) 0 0;

	> label {
		display: inline-block;
		font-size: var(--font-size-s);
		font-weight: var(--font-weight-bold);
		padding: 0 0 var(--spacing-2xs);
	}

	small {
		display: block;
		padding: var(--spacing-2xs) 0 0;
		font-size: var(--font-size-2xs);
		color: var(--color-text-base);
	}
}

.actionBox {
	margin: var(--spacing-2xl) 0 0;
}

.footer {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}
</style>
