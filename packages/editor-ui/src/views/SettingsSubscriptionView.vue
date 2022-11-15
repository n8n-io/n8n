<script lang="ts">
import { SUBSCRIPTION_APP_URL, VIEWS } from '@/constants';
import { useRootStore } from '@/stores/n8nRootStore';
import { useLicenseStore } from '@/stores/license';
import { mapStores } from 'pinia';
import { showMessage } from '@/components/mixins/showMessage';
import mixins from 'vue-typed-mixins';
import { LicenseProductInfo } from '@/Interface';

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
		};
	},
	mounted() {
		if (this.$route.name !== VIEWS.SUBSCRIPTION_ACTIVATE) {
			return;
		}
		void this.activate();
	},
	computed: {
		...mapStores(useRootStore, useLicenseStore),
		license(): LicenseProductInfo | undefined {
			return this.licenseStore.productInfo;
		},
	},
	methods: {
		openLinkPage() {
			const callbackUrl = encodeURIComponent(
				`${window.location.host}/subscription/activate/${this.rootStore.instanceId}`,
			);
			window.open(new URL(`callback=${callbackUrl}`, SUBSCRIPTION_APP_URL), '_blank');
		},
		async activate() {
			const activationKey = this.$route.params.key;
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

<template>
	<div :class="[$style.container]">
		<div class="mb-2xl">
			<n8n-heading size="2xlarge">
				{{ $locale.baseText('settings.subscription') }}
			</n8n-heading>
		</div>
		<div v-if="license">
			{{ license.planName }}
		</div>
		<div v-else-if="isActivating" :class="$style.actionBoxContainer">
			<div :class="$style.loader">
				<n8n-spinner size="large" />
			</div>
			<div>
				{{ $locale.baseText('settings.subscription.activating') }}
			</div>
		</div>
		<div v-else :class="$style.actionBoxContainer">
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
</style>
