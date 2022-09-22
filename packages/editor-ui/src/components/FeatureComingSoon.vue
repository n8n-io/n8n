<template>
	<div v-if="this.featureInfo" :class="[$style.container]">
		<div v-if="showTitle" class="mb-2xl">
			<n8n-heading size="2xlarge">
				{{$locale.baseText(featureInfo.featureName)}}
			</n8n-heading>
		</div>
		<div v-if="featureInfo.infoText" class="mb-l">
			<n8n-info-tip theme="info" type="note">
				<template>
					<span v-html="$locale.baseText(featureInfo.infoText)"></span>
				</template>
			</n8n-info-tip>
		</div>
		<div :class="$style.actionBoxContainer">
			<n8n-action-box
				:description="$locale.baseText(featureInfo.actionBoxDescription)"
				:buttonText="$locale.baseText(featureInfo.actionBoxButtonLabel || 'fakeDoor.actionBox.button.label')"
				@click="openLinkPage"
			>
				<template #heading>
					<span v-html="$locale.baseText(featureInfo.actionBoxTitle)"/>
				</template>
			</n8n-action-box>
		</div>
	</div>
</template>

<script lang="ts">
import {IFakeDoor} from '@/Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'FeatureComingSoon',
	props: {
		featureId: {
			type: String,
			required: true,
		},
		showTitle: {
			type: Boolean,
			default: false,
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
	},
	methods: {
		openLinkPage() {
			window.open(`${this.featureInfo.linkURL}&u=${this.instanceId}#${this.userId}&v=${this.versionCli}`, '_blank');
			this.$telemetry.track('user clicked feature waiting list button', {feature: this.featureId});
		},
	},
});
</script>

<style lang="scss" module>
.actionBoxContainer {
	text-align: center;
}
</style>

