<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('settings.api') }}
				</n8n-heading>
			</div>

			<div v-if="apiKey">
				<p class="mb-s">
					<n8n-info-tip :bold="false">
						{{ $locale.baseText('settings.api.view.info') }}
						<n8n-link to="https://docs.n8n.io/api/" size="small">
							{{ $locale.baseText('generic.learnMore') }}
						</n8n-link>
					</n8n-info-tip>
				</p>
				<n8n-card :class="$style.card">
					<span :class="$style.delete">
						<n8n-link @click="showDeleteModal" :bold="true">
							{{ $locale.baseText('generic.delete') }}
						</n8n-link>
					</span>
					<CopyInput
						:label="$locale.baseText('settings.api.view.myKey')"
						:value="apiKey"
						:copy-button-text="$locale.baseText('generic.clickToCopy')"
						:toast-title="$locale.baseText('settings.api.view.copy.toast')"
					/>
				</n8n-card>
			</div>
			<n8n-action-box
				v-else-if="mounted"
				:heading="$locale.baseText('settings.api.create.title')"
				:buttonText="$locale.baseText(loading ? 'settings.api.create.button.loading' : 'settings.api.create.button')"
				:description="$locale.baseText('settings.api.create.description')"
				:loading="loading"
				@click="createApiKey"
			/>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';
import CopyInput from '../components/CopyInput.vue';

export default mixins(
	showMessage,
).extend({
	name: 'SettingsPersonalView',
	components: {
		SettingsView,
		CopyInput,
	},
	data() {
		return {
			loading: false,
			mounted: false,
			apiKey: '',
		};
	},
	mounted() {
		this.getApiKey();
	},
	computed: {
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
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
				this.apiKey = await this.$store.dispatch('settings/getApiKey');
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.view.error'));
			} finally {
				this.mounted = true;
			}
		},
		async createApiKey() {
			this.loading = true;

			try {
				this.apiKey = await this.$store.dispatch('settings/createApiKey');
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.create.error'));
			} finally {
				this.loading = false;
			}
		},
		async deleteApiKey() {
			try {
				await this.$store.dispatch('settings/deleteApiKey');
				this.$showMessage({ title: this.$locale.baseText("settings.api.delete.toast"), type: 'success' });
				this.apiKey = '';
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.delete.error'));
			}
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
</style>

