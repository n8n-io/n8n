<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">
					{{ $locale.baseText('settings.api') }}
				</n8n-heading>
			</div>
			<n8n-card v-if="apiKey">
				Hello
			</n8n-card>
			<div :class="$style.placeholder" v-else>
				<n8n-heading size="xlarge">
					{{ $locale.baseText('settings.api.create.title') }}
				</n8n-heading>
				<p class="mt-2xs mb-l">
					{{$locale.baseText('settings.api.create.description')}}
					<a href="https://docs.n8n.io/reference/glossary/#rest-api" target="_blank">
						{{$locale.baseText('settings.api.create.description.link')}}
					</a>
				</p>
				<n8n-button :loading="loading" size="large" class="mt-l" @click="createApiKey">
					{{$locale.baseText(loading ? 'settings.api.create.button.loading' : 'settings.api.create.button')}}
				</n8n-button>
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import {createApiKey, deleteApiKey, getApiKey } from '../api/api-keys';
import { showMessage } from '@/components/mixins/showMessage';
import { IUser } from '@/Interface';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';

export default mixins(
	showMessage,
).extend({
	name: 'SettingsPersonalView',
	components: {
		SettingsView,
	},
	data() {
		return {
			apiKey: '' as string | null,
			loading: false,
			mounted: false,
			error: '',
		};
	},
	async mounted() {
		this.getApiKey();
	},
	computed: {
		currentUser() {
			return this.$store.getters['users/currentUser'] as IUser;
		},
	},
	methods: {
		async getApiKey() {
			try {
				const { apiKey } = await getApiKey(this.$store.getters['getRestApiContext']);
				this.apiKey = apiKey;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.error.get'));
			} finally {
				this.mounted = true;
			}
		},
		async createApiKey() {
			this.loading = true;

			try {
				const { apiKey } = await createApiKey(this.$store.getters['getRestApiContext']);
				this.apiKey = apiKey;
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.error.create'));
			} finally {
				this.loading = false;
			}
		},
		async deleteApiKey() {
			this.loading = true;

			try {
				await deleteApiKey(this.$store.getters['getRestApiContext']);
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.api.error.delete'));
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

.placeholder {
	border-radius: var(--border-radius-xlarge);
	border: 2px dashed var(--color-foreground-light);
	height: 245px;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
}
</style>

