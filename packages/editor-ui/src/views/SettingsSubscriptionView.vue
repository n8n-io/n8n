<script lang="ts">
import { SUBSCRIPTION_APP_URL } from '@/constants';
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
			<n8n-action-box
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
</style>
