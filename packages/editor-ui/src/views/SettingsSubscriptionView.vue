<template>
	<div :class="[$style.container]">
		<div class="mb-2xl">
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('settings.subscription') }}
			</n8n-heading>
		</div>
		<div v-if="license && !loading">
			<n8n-heading size="large" class="mb-l" tag="div">
				{{
					$locale.baseText('settings.subscription.plan', {
						interpolate: { name: license.productInfo.planName },
					})
				}}
			</n8n-heading>

			<n8n-info-tip theme="info" type="note" class="mb-l">
				<template>
					<span v-html="$locale.baseText('settings.subscription.info', { interpolate: { name: license.productInfo.planName }} )"></span>
				</template>
			</n8n-info-tip>

			<table :class="$style.features">
				<tr v-for="feature in licenseStore.features" :key="feature.id">
					<th>
						{{ feature.name }}
						<n8n-info-tip
							v-if="feature.description"
							type="tooltip"
							theme="info-light"
							tooltipPlacement="top"
						>
							<div>
								{{ feature.description }}
							</div>
						</n8n-info-tip>
					</th>
					<th>
						<WarningTooltip v-if="feature.unsupported && feature.minVersion">
							<template>
								<span v-html="$locale.baseText('settings.subscription.unsupported', { interpolate: { version: feature.minVersion }} )"></span>
							</template>
						</WarningTooltip>
						<span v-else-if="feature.value === true" :title="$locale.baseText('settings.subscription.enabled')"> ✅ </span>
						<span v-else-if="feature.value === false" :title="$locale.baseText('settings.subscription.disabled')"> ❌ </span>
						<span v-else-if="feature.value === -1">
							{{ $locale.baseText('settings.subscription.unlimited') }}
						</span>
						<span v-else>
							{{ feature.value }}
						</span>
					</th>
				</tr>
			</table>
		</div>
		<div v-else-if="isActivating" :class="$style.actionBoxContainer">
			<div :class="$style.loader">
				<n8n-spinner size="large" />
			</div>
			<div>
				{{ $locale.baseText('settings.subscription.activating') }}
			</div>
		</div>
		<div v-else-if="!loading && !license" :class="$style.actionBoxContainer">
			<n8n-action-box
				:description="$locale.baseText('settings.subscription.cta.description')"
				:buttonText="$locale.baseText('settings.subscription.cta.button')"
				@click="openLinkPage"
			>
				<template #heading>
					<span v-html="$locale.baseText('settings.subscription.cta.title')" />
				</template>
			</n8n-action-box>
		</div>
	</div>
</template>

<script lang="ts">
import { SUBSCRIPTION_APP_URL, VIEWS } from '@/constants';
import { useRootStore } from '@/stores/n8nRootStore';
import { useLicenseStore } from '@/stores/license';
import { mapStores } from 'pinia';
import { showMessage } from '@/components/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { LicenseResponse, LicenseFeatureExpanded } from '@/Interface';
import WarningTooltip from '@/components/WarningTooltip.vue';

export default mixins(showMessage).extend({
	name: 'SettingsSubscriptionView',
	components: {
		WarningTooltip,
	},
	props: {
		featureId: {
			type: String,
		},
		showTitle: {
			type: Boolean,
		},
	},
	data() {
		return {
			isActivating: false,
			loading: false,
		};
	},
	mounted() {
		if (this.$route.name === VIEWS.SUBSCRIPTION_ACTIVATE) {
			const activationKey = this.$route.params.key;
			void this.activate(activationKey);
		} else {
			// always renew license to refresh tokens
			void this.renew();
		}
	},
	computed: {
		...mapStores(useRootStore, useLicenseStore),
		license(): LicenseResponse | undefined {
			return this.licenseStore.license;
		},
	},
	methods: {
		openLinkPage() {
			const callbackUrl = encodeURIComponent(
				`${window.location.host}/subscription/activate/${this.rootStore.instanceId}`,
			);
			const instanceId = this.rootStore.instanceId;
			window.open(new URL(`instanceid=${instanceId}&callback=${callbackUrl}`, SUBSCRIPTION_APP_URL), '_blank');
		},
		async renew() {
			this.loading = true;
			try {
				await this.licenseStore.renewLicense();
			} catch (e: unknown) {
				if (e instanceof Error) {
					const errorTitle = this.$locale.baseText('settings.subscription.renew.error');
					this.$showError(e, errorTitle);
				}
			} finally {
				this.loading = false;
			}
		},
		async activate(activationKey: string) {
			this.isActivating = true;
			try {
				await this.licenseStore.activateLicense(activationKey);
			} catch (e: unknown) {
				if (e instanceof Error) {
					const errorTitle = this.$locale.baseText('settings.subscription.activation.error');
					this.$showError(e, errorTitle);
				}
			} finally {
				this.isActivating = false;
				this.$router.push({ name: VIEWS.SUBSCRIPTION });
			}
		},
	},
});
</script>

<style lang="scss" module>
.actionBoxContainer {
	text-align: center;
}

.loader {
	margin-bottom: var(--spacing-s);

	svg {
		min-width: 40px;
		min-height: 40px;
	}
}

.grid {
	display: grid;
	grid-template-columns: auto auto;
	row-gap: var(--spacing-s);
}

.features {
	text-align: left;
	border-spacing: 0 var(--spacing-s);
	border-collapse: separate;

	th {
		font-weight: var(--font-weight-regular);
		padding-right: var(--spacing-xl);
	}
}
</style>
