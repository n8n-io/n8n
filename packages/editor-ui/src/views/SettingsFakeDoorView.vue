<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="[$style.headingContainer, 'mb-l']">
				<n8n-heading size="2xlarge">{{ $locale.baseText(featureName) }}</n8n-heading>
			</div>
			<div class="mt-3xl mb-2xl">
				<n8n-info-tip theme="info" type="note">
					<template>
						<span v-html="$locale.baseText(infoText)"></span>
					</template>
				</n8n-info-tip>
			</div>
			<div :class="$style.actionBoxContainer">
				<n8n-action-box
					:heading="$locale.baseText(actionBoxTitle)"
					:description="$locale.baseText(actionBoxDescription)"
					:buttonText="$locale.baseText('fakeDoor.actionBox.button.label')"
					@click="openLinkPage"
				/>
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import Vue from 'vue';
import SettingsView from './SettingsView.vue';

export default Vue.extend({
	name: 'SettingsFakeDoorView',
	components: {
		SettingsView,
	},
	props: {
		featureName: {
			type: String,
			required: true,
		},
		infoText: {
			type: String,
			required: true,
		},
		actionBoxTitle: {
			type: String,
			required: true,
		},
		actionBoxDescription: {
			type: String,
			required: true,
		},
		linkURL: {
			type: String,
			required: true,
		},
	},
	methods: {
		openLinkPage() {
			window.open(this.linkURL, '_blank');
		},
	},
});
</script>

<style lang="scss" module>
	.actionBoxContainer {
		text-align: center;
	}
</style>
