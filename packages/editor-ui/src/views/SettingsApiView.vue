<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('settings.api') }}
				<span :style="{ fontSize: 'var(--font-size-s)', color: 'var(--color-text-light)' }">
					({{ $locale.baseText('beta') }})
				</span>
			</n8n-heading>
		</div>

		<div v-if="apiKey">
			<p class="mb-s">
				<n8n-info-tip :bold="false">
					<i18n path="settings.api.view.info" tag="span">
						<template #apiAction>
							<a
								href="https://docs.n8n.io/api"
								target="_blank"
								v-text="$locale.baseText('settings.api.view.info.api')"
							/>
						</template>
						<template #webhookAction>
							<a
								href="https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.webhook/"
								target="_blank"
								v-text="$locale.baseText('settings.api.view.info.webhook')"
							/>
						</template>
					</i18n>
				</n8n-info-tip>
			</p>
			<n8n-card class="mb-4xs" :class="$style.card">
				<span :class="$style.delete">
					<n8n-link @click="showDeleteModal" :bold="true">
						{{ $locale.baseText('generic.delete') }}
					</n8n-link>
				</span>
				<div class="ph-no-capture">
					<CopyInput
						:label="$locale.baseText('settings.api.view.myKey')"
						:value="apiKey"
						:copy-button-text="$locale.baseText('generic.clickToCopy')"
						:toast-title="$locale.baseText('settings.api.view.copy.toast')"
						@copy="onCopy"
					/>
				</div>
			</n8n-card>
			<div :class="$style.hint">
				<n8n-text size="small">
					{{ $locale.baseText('settings.api.view.tryapi') }}
				</n8n-text>
				<n8n-link :to="apiPlaygroundPath" :newWindow="true" size="small">
					{{ $locale.baseText('settings.api.view.apiPlayground') }}
				</n8n-link>
			</div>
		</div>
		<n8n-action-box
			v-else-if="mounted"
			:buttonText="
				$locale.baseText(
					loading ? 'settings.api.create.button.loading' : 'settings.api.create.button',
				)
			"
			:description="$locale.baseText('settings.api.create.description')"
			@click="createApiKey"
		/>
	</div>
</template>

<script lang="ts">
import { showMessage } from '@/mixins/showMessage';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';

import CopyInput from '@/components/CopyInput.vue';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { useRootStore } from '@/stores/n8nRootStore';
import { useUsersStore } from '@/stores/users';

export default mixins(showMessage).extend({
	name: 'SettingsPersonalView',
	components: {
		CopyInput,
	},
	data() {
		return {
			loading: false,
			mounted: false,
			apiKey: '',
			apiPlaygroundPath: '',
		};
	},
	mounted() {
		this.getApiKey();
		const baseUrl = this.rootStore.baseUrl;
		const apiPath = this.settingsStore.publicApiPath;
		const latestVersion = this.settingsStore.publicApiLatestVersion;
		this.apiPlaygroundPath = `${baseUrl}${apiPath}/v${latestVersion}/docs`;
	},
	computed: {
		...mapStores(useRootStore, useSettingsStore, useUsersStore),
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
	},
	methods: {
		async showDeleteModal() {
			const confirmed = await this.confirmMessage(
				this.$locale.baseText('settings.api.delete.description'),
				this.$locale.baseText('settings.api.delete.title'),
				null,
				this.$locale.baseText('settings.api.delete.button'),
				this.$locale.baseText('generic.cancel'),
			);
			if (confirmed) {
				this.deleteApiKey();
			}
		},
		async getApiKey() {
			try {
				this.apiKey = (await this.settingsStore.getApiKey()) || '';
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.view.error'));
			} finally {
				this.mounted = true;
			}
		},
		async createApiKey() {
			this.loading = true;

			try {
				this.apiKey = (await this.settingsStore.createApiKey()) || '';
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.create.error'));
			} finally {
				this.loading = false;
				this.$telemetry.track('User clicked create API key button');
			}
		},
		async deleteApiKey() {
			try {
				await this.settingsStore.deleteApiKey();
				this.$showMessage({
					title: this.$locale.baseText('settings.api.delete.toast'),
					type: 'success',
				});
				this.apiKey = '';
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.delete.error'));
			} finally {
				this.$telemetry.track('User clicked delete API key button');
			}
		},
		onCopy() {
			this.$telemetry.track('User clicked copy API key button');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.card {
	position: relative;
}

.delete {
	position: absolute;
	display: inline-block;
	top: var(--spacing-s);
	right: var(--spacing-s);
}

.hint {
	color: var(--color-text-light);
}
</style>
