<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useSSOStore } from '@/stores/sso';
import { i18n as locale } from '@/plugins/i18n';
import CopyInput from '@/components/CopyInput.vue';

const ssoStore = useSSOStore();

const ssoActivatedLabel = computed(() =>
	ssoStore.isSamlLoginEnabled
		? locale.baseText('settings.sso.activated')
		: locale.baseText('settings.sso.deactivated'),
);

const ssoSettingsSaved = ref(false);
const metadata = ref('');
const redirectUrl = ref('');
const entityId = ref('');

const onSave = async () => {
	try {
		await ssoStore.saveSamlConfig({ metadata: metadata.value });
		ssoSettingsSaved.value = true;
	} catch (error) {
		console.error(error);
	}
};

const onTest = () => {
	console.log('test');
};
</script>

<template>
	<div>
		<n8n-heading size="2xlarge">{{ locale.baseText('settings.sso.title') }}</n8n-heading>
		<div :class="$style.top">
			<n8n-heading size="medium">{{ locale.baseText('settings.sso.subtitle') }}</n8n-heading>
			<n8n-tooltip :disabled="ssoStore.isSamlLoginEnabled">
				<template #content>
					<span>
						{{ locale.baseText('settings.sso.activation.tooltip') }}
					</span>
				</template>
				<el-switch
					v-model="ssoStore.isSamlLoginEnabled"
					:disabled="!ssoSettingsSaved && !ssoStore.isSamlLoginEnabled"
					:class="$style.switch"
					:inactive-text="ssoActivatedLabel"
				/>
			</n8n-tooltip>
		</div>
		<n8n-info-tip>
			<i18n :class="$style.count" path="settings.sso.info">
				<template #link>
					<a href="https://docs.n8n.io/user-management/sso/" target="_blank">
						{{ locale.baseText('settings.sso.info.link') }}
					</a>
				</template>
			</i18n>
		</n8n-info-tip>
		<div :class="$style.group">
			<label>{{ locale.baseText('settings.sso.settings.redirectUrl.label') }}</label>
			<CopyInput
				:value="redirectUrl"
				:copy-button-text="locale.baseText('generic.clickToCopy')"
				:toast-title="locale.baseText('settings.api.view.copy.toast')"
			/>
			<span>{{ locale.baseText('settings.sso.settings.redirectUrl.help') }}</span>
		</div>
		<div :class="$style.group">
			<label>{{ locale.baseText('settings.sso.settings.entityId.label') }}</label>
			<CopyInput
				:value="entityId"
				:copy-button-text="locale.baseText('generic.clickToCopy')"
				:toast-title="locale.baseText('settings.api.view.copy.toast')"
			/>
			<span>{{ locale.baseText('settings.sso.settings.entityId.help') }}</span>
		</div>
		<div :class="$style.group">
			<label>{{ locale.baseText('settings.sso.settings.ips.label') }}</label>
			<n8n-input v-model="metadata" type="textarea" />
			<span>{{ locale.baseText('settings.sso.settings.ips.help') }}</span>
		</div>
		<div :class="$style.buttons">
			<n8n-button type="tertiary" @click="onTest">
				{{ locale.baseText('settings.sso.settings.test') }}
			</n8n-button>
			<n8n-button @click="onSave">
				{{ locale.baseText('settings.sso.settings.save') }}
			</n8n-button>
		</div>
	</div>
</template>

<style lang="scss" module>
.top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-2xl) 0 var(--spacing-m);
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
	padding: var(--spacing-2xl) 0 0;

	button {
		margin: 0 var(--spacing-s) 0 0;
	}
}

.group {
	padding: var(--spacing-2xl) 0 0;
}
</style>
