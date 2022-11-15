<script lang="ts">
import { SUBSCRIPTION_APP_URL, VIEWS } from '@/constants';
import { useRootStore } from '@/stores/n8nRootStore';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'SettingsSubscriptionView',
	props: {
		featureId: {
			type: String,
		},
		showTitle: {
			type: Boolean,
		},
	},
	mounted() {
	},
	computed: {
		isActivating(): boolean {
			return this.$route.name === VIEWS.SUBSCRIPTION_ACTIVATE;
		},
	},
	methods: {
		openLinkPage() {
			const rootStore = useRootStore();
			const callbackUrl = encodeURIComponent(`${window.location.host}/subscription/activate/${rootStore.instanceId}`);
			window.open(new URL(`callback=${callbackUrl}`, SUBSCRIPTION_APP_URL), '_blank');
		},
	},
});

</script>

<template>
	<div :class="[$style.container]">
		<div class="mb-2xl">
			<n8n-heading size="2xlarge">
				{{$locale.baseText('settings.subscription')}}
			</n8n-heading>
		</div>
		<div :class="$style.actionBoxContainer">
			<div v-if="isActivating">
				<div :class="$style.loader">
					<n8n-spinner size="large" />
				</div>
				<div>
					{{ $locale.baseText('settings.subscription.activating') }}
				</div>
			</div>
			<n8n-action-box
				v-else
				:description="$locale.baseText('settings.subscription.cta.description')"
				:buttonText="$locale.baseText('settings.subscription.cta.button')"
				@click="openLinkPage"
			>
				<template #heading>
					<span v-html="$locale.baseText('settings.subscription.cta.title')"/>
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
