<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">{{ "AD/LDAP" }}</n8n-heading>
			</div>

			<div :class="$style.enableFeatureContainer" >
				<span>Enable Feature</span>
				<el-switch
					v-model="adConfig.activeDirectoryLoginEnabled"
					active-color="#13ce66"
					:disabled="isReadOnly"
					@change="valueChanged"
				/>
			</div>
			<div>
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					columnView=true
					@input="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
			<div>
				<n8n-button float="right" :label="$locale.baseText('settings.personal.save')" size="large" :disabled="!hasAnyChanges || !readyToSubmit" @click="onSaveClick" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { IFormInputs, IUser } from '@/Interface';
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import SettingsView from './SettingsView.vue';

export default mixins(
	showMessage,
).extend({
	name: 'SettingsActiveDirectoryView',
	components: {
		SettingsView,
	},
	data() {
		return {
			adConfig: {} as {
				activeDirectoryLoginEnabled: boolean;
				attributeMapping: {
					email: string;
					firstName: string;
					lastName: string;
					loginId: string;
					username: string;
				},
				binding: {
					adminDn: string;
					adminPassword: string;
					baseDn: string;
				},
				connection: {
					url: string;
				},
			},
			mounted: false,
			hasAnyChanges: false,
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
		};
	},
	mounted() {
		this.getADConfig();
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
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: {firstName: string, lastName: string, email: string}) {
			if (!this.hasAnyChanges) {
				return;
			}
			try {
				await this.$store.dispatch('users/updateUser', {
					id: this.currentUser.id,
					firstName: form.firstName,
					lastName: form.lastName,
					email: form.email,
				});
				this.$showToast({
					title: this.$locale.baseText('settings.personal.personalSettingsUpdated'),
					message: '',
					type: 'success',
				});
				this.hasAnyChanges = false;
			}
			catch (e) {
				this.$showError(e, this.$locale.baseText('settings.personal.personalSettingsUpdatedError'));
			}
		},
		async getADConfig() {
			try {
				this.adConfig = await this.$store.dispatch('settings/getADConfig');
				this.formInputs = [
					{
						name: 'connectionInfo',
						properties: {
							label: 'Connection Details',
							type: 'info',
						},
					},
					{
						name: 'serverAddress',
						initialValue: this.adConfig.connection.url,
						properties: {
							label: 'Server Address',
							maxlength: 32,
							required: true,
							autocomplete: 'given-name',
							capitalize: true,
						},
					},
					{
						name: 'baseDn',
						initialValue: this.adConfig.binding.baseDn,
						properties: {
							label: 'Base DN',
							maxlength: 32,
							required: true,
							autocomplete: 'family-name',
							capitalize: true,
						},
					},
					{
						name: 'bindingType',
						initialValue: 'admin',
						properties: {
							type: 'select',
							label: 'Binding as',
							options: [
								{
									value: 'admin',
									label: 'Admin',
								},
								{
									value: 'anonymous',
									label: 'Anonymous',
								},
							],
						},
					},
					{
						name: 'adminDn',
						initialValue: this.adConfig.binding.adminDn,
						properties: {
							label: 'Binding DN',
							maxlength: 32,
							required: true,
							autocomplete: 'family-name',
							capitalize: true,
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin';
						},
					},
					{
						name: 'adminPassword',
						initialValue:this.adConfig.binding.adminPassword,
						properties: {
							label: 'Binding Password',
							type: 'password',
							required: true,
							capitalize: true,
						},
						shouldDisplay(values): boolean {
							return values['bindingType'] === 'admin';
						},
					},
					{
						name: 'attributeMappingInfo',
						properties: {
							label: 'Attribute Mapping',
							type: 'info',
						},
					},
					{
						name: 'loginId',
						initialValue: this.adConfig.attributeMapping.loginId,
						properties: {
							label: 'Login ID',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'email',
						initialValue: this.adConfig.attributeMapping.email,
						properties: {
							label: 'Email',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'firstName',
						initialValue: this.adConfig.attributeMapping.firstName,
						properties: {
							label: 'Fist Name',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
					{
						name: 'lastName',
						initialValue: this.adConfig.attributeMapping.lastName,
						properties: {
							label: 'Last Name',
							type: 'text',
							autocomplete: 'email',
							required: true,
							capitalize: true,
						},
					},
				];
			} catch (error) {
				//this.$showError(error, this.$locale.baseText('settings.api.view.error'));
			} finally {
				this.mounted = true;
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-2xl);
	}
	padding-bottom: 100px;
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;

	*:first-child {
		flex-grow: 1;
	}
}

.user {
	display: flex;
	align-items: center;

	@media (max-width: $--breakpoint-2xs) {
		display: none;
	}
}

.enableFeatureContainer {
	margin-bottom: var(--spacing-1xl),
}

.enableFeatureContainer > span {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);
	padding: 0
}

.enableFeatureContainer {
	> * {
    padding: .5em;
  }
}


.username {
	margin-right: var(--spacing-s);
	text-align: right;

	@media (max-width: $--breakpoint-sm) {
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.sectionHeader {
	margin-bottom: var(--spacing-s);
}
</style>

