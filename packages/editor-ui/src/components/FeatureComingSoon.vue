<template>
	<div v-if="this.featureInfo" :class="$style.container">
			<div v-if="showHeading" :class="[$style.headingContainer, 'mb-l']">
				<n8n-heading size="2xlarge">{{ $locale.baseText(featureInfo.featureName) }}</n8n-heading>
			</div>
			<div v-if="featureInfo.infoText" class="mt-3xl mb-l">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText(featureInfo.infoText)"></span>
					</template>
				</n8n-info-tip>
			</div>
			<div :class="$style.actionBoxContainer">
				<n8n-action-box
					:heading="$locale.baseText(featureInfo.actionBoxTitle)"
					:description="$locale.baseText(featureInfo.actionBoxDescription)"
					:buttonText="$locale.baseText('fakeDoor.actionBox.button.label')"
					@click="openLinkPage"
				/>
			</div>
		</div>
</template>

<script lang="ts">
import { FAKE_DOOR_FEATURES } from '@/constants';
import { IFakeDoor } from '@/Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'FeatureComingSoon',
	props: {
		featureId: {
			type: String,
			required: true,
		},
	},
	computed: {
		userId(): string {
			return this.$store.getters['users/currentUserId'];
		},
		versionCli(): string {
			return this.$store.getters['settings/versionCli'];
		},
		instanceId(): string {
			return this.$store.getters.instanceId;
		},
		featureInfo(): IFakeDoor {
			return this.$store.getters['ui/getFakeDoorById'](this.featureId);
		},
		showHeading(): boolean {
			const featuresWithoutHeading = [
				FAKE_DOOR_FEATURES.SHARING.toString(),
			];
			return !featuresWithoutHeading.includes(this.featureId);
		},
	},
	methods: {
		openLinkPage() {
			window.open(`${this.featureInfo.linkURL}&u=${this.instanceId}#${this.userId}&v=${this.versionCli}`, '_blank');
			this.$telemetry.track('user clicked feature waiting list button', { feature: this.featureId });
		},
	},
});
</script>

<style lang="scss" module>
	.actionBoxContainer {
		text-align: center;
	}
</style>

