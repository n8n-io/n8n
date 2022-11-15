<template>
	<div :class="[$style.container]">
		<div class="mb-2xl">
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('settings.subscription') }}
			</n8n-heading>
		</div>
		<div v-if="license && !loading">
			<n8n-heading size="large" class="mb-l" tag="div">
				{{ $locale.baseText('settings.subscription.plan', { interpolate: { name: license.productInfo.planName } }) }}
			</n8n-heading>

			<div :class="$style.grid">
				<div v-for="(cell, i) in tableData" :key="i">
					{{ cell.type === 'key' ? cell.label : cell.value }}
				</div>
			</div>
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

type TableCell =
	| {
			type: 'key';
			label: string;
	  }
	| {
			type: 'value';
			value: string | number | boolean;
	  };

export default mixins(showMessage).extend({
	name: 'SettingsSubscriptionView',
	mixins: [showMessage],
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
			loading: true,
		};
	},
	mounted() {
		if (this.$route.name === VIEWS.SUBSCRIPTION_ACTIVATE) {
			const activationKey = this.$route.params.key;
			void this.activate(activationKey);
		} else {
			void this.renew();
		}
	},
	computed: {
		...mapStores(useRootStore, useLicenseStore),
		license(): LicenseResponse | undefined {
			return this.licenseStore.license;
		},
		tableData(): TableCell[] {
			return this.licenseStore.features.reduce(
				(accu: TableCell[], feature: LicenseFeatureExpanded) => {
					accu.push({
						type: 'key',
						label: feature.name,
					});

					accu.push({
						type: 'value',
						value: 0,
					});

					return accu;
				},
				[] as TableCell[],
			);
		},
	},
	methods: {
		openLinkPage() {
			const callbackUrl = encodeURIComponent(
				`${window.location.host}/subscription/activate/${this.rootStore.instanceId}`,
			);
			window.open(new URL(`callback=${callbackUrl}`, SUBSCRIPTION_APP_URL), '_blank');
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
				this.$router.push({ name: VIEWS.SUBSCRIPTION });
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
</style>
