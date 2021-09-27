<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">Personal Settings</n8n-heading>
				<div :class="$style.user">
					<n8n-text :class="$style.username" color="light">{{currentUser.firstName}} {{currentUser.lastName}}</n8n-text>
					<n8n-avatar :firstName="currentUser.firstName" :lastName="currentUser.lastName" size="large" />
				</div>
			</div>
			<div>
				<div :class="$style.sectionTitle">
					<n8n-heading size="large">Basic information</n8n-heading>
				</div>
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					@input="onInput"
					@submit="onSubmit"
				/>
			</div>
			<div>
				<div :class="$style.sectionTitle">
					<n8n-heading size="large">Security</n8n-heading>
				</div>
				<div>
					<n8n-input-label label="Password">
						<n8n-link @click="openPasswordModal">Change password</n8n-link>
					</n8n-input-label>
				</div>
			</div>
			<div>
				<n8n-button float="right" label="Save" size="large" :disabled="!hasAnyChanges" @click="onSaveClick" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { CHANGE_PASSWORD_MODAL_KEY } from '@/constants';
import { IUser } from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';

export default mixins(
	showMessage,
).extend({
	name: 'SettingsPersonalView',
	components: {
		SettingsView,
	},
	data() {
		return {
			hasAnyChanges: false,
			formInputs: null as any,
			formBus: new Vue(),
		};
	},
	mounted() {
		this.formInputs = [
			[
				{
					name: 'firstName',
					initialValue: this.currentUser.firstName,
					properties: {
						label: 'First name',
						maxlength: 32,
						required: true,
					},
				},
				{
					name: 'lastName',
					initialValue: this.currentUser.lastName,
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
					initialValue: this.currentUser.email,
					properties: {
						label: 'Email',
						type: 'email',
						required: true,
						validationRules: [{name: 'VALID_EMAIL'}],
					},
				},
			],
		];
	},
	computed: {
		currentUser() {
			return this.$store.getters['users/currentUser'] as IUser;
		},
	},
	methods: {
		onInput() {
			this.hasAnyChanges = true;
		},
		async onSubmit(form: {firstName: string, lastName: string, email: string}) {
			try {
				await this.$store.dispatch('users/updateUser', {
					id: this.currentUser.id,
					firstName: form.firstName,
					lastName: form.lastName,
					email: form.email,
				});
				this.$showToast({
					title: 'Updated your details',
					message: 'Successfully updated your personal settings',
					type: 'success',
				});
				this.hasAnyChanges = false;
			}
			catch (e) {
				this.$showError(e, 'Problem updating your details');
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
		openPasswordModal() {
			this.$store.dispatch('ui/openModal', CHANGE_PASSWORD_MODAL_KEY);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.header {
	display: flex;
	align-items: center;

	*:first-child {
		flex-grow: 1;
	}
}

.user {
	display: flex;
	align-items: center;
	* {
		margin-left: var(--spacing-s);
	}
}

.sectionTitle {
	margin-bottom: var(--spacing-s);
}
</style>

