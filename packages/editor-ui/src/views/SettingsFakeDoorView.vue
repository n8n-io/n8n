<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="[$style.headingContainer, 'mb-l']">
				<n8n-heading size="2xlarge">{{ $locale.baseText(featureInfo.featureName) }}</n8n-heading>
			</div>
			<div class="mt-3xl mb-2xl">
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
	</SettingsView>
</template>

<script lang="ts">
import { IFakeDoor } from '@/Interface';
import Vue from 'vue';
import SettingsView from './SettingsView.vue';

export default Vue.extend({
	name: 'SettingsFakeDoorView',
	components: {
		SettingsView,
	},
	props: {
		featureId: {
			type: String,
			required: true,
		},
	},
	mounted() {
		// TODO: Remove this once custom route permissions are merged and implemented
		if(!this.featureInfo) {
			this.$router.push('/');
		}
	},
	computed: {
		featureInfo(): IFakeDoor {
			return this.$store.getters['ui/getFakeDoorFeatures'][this.featureId] as IFakeDoor;
		},
	},
	methods: {
		openLinkPage() {
			window.open(this.featureInfo.linkURL, '_blank');
		},
	},
});
</script>

<style lang="scss" module>
	.actionBoxContainer {
		text-align: center;
	}
</style>
