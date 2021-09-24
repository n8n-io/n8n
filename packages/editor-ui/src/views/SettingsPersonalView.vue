<template>
	<SettingsView>
		<div :class="$style.header">
			<n8n-heading size="2xlarge">Personal Settings</n8n-heading>
		</div>
		<div>
			<div :class="$style.sectionTitle">
				<n8n-heading size="large">Basic information</n8n-heading>
			</div>
			<n8n-form-inputs
				:inputs="FORM_INPUTS"
			/>
		</div>
		<div>
			<div :class="$style.sectionTitle">
				<n8n-heading size="large">Security</n8n-heading>
			</div>
			<div>
				<n8n-input-label label="Password">
					<n8n-link>Change password</n8n-link>
				</n8n-input-label>
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { IUser } from '@/Interface';
import Vue from 'vue';

import SettingsView from './SettingsView.vue';

export default Vue.extend({
	name: 'SettingsPersonalView',
	components: {
		SettingsView,
	},
	data() {
		const user = this.$store.getters['users/currentUser'] as IUser;

		const FORM_INPUTS = [
			[
				{
					name: 'firstName',
					initialValue: user.firstName,
					sm: 12,
					properties: {
						label: 'First name',
						maxlength: 32,
						required: true,
					},
				},
				{
					name: 'lastName',
					initialValue: user.lastName,
					sm: {
						span: 11,
						offset: 1,
					},
					properties: {
						label: 'Last name',
						maxlength: 32,
						required: true,
					},
				},
			],
			[
				{
					name: 'email',
					initialValue: user.email,
					sm: 12,
					properties: {
						label: 'Email',
						type: 'email',
						required: true,
						validationRules: [{name: 'VALID_EMAIL'}],
						md: 12,
					},
				},
			],
		];

		return {
			FORM_INPUTS,
		};
	},
});
</script>

<style lang="scss" module>
.header {
	margin-bottom: var(--spacing-2xl);
}

.sectionTitle {
	margin-bottom: var(--spacing-s);
}
</style>

