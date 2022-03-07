<template>
	<SettingsView>
		<div :class="$style.container">
			<div :class="$style.header">
				<n8n-heading size="2xlarge">{{ $locale.baseText('PERSONAL_SETTINGS') }}</n8n-heading>
				<div :class="$style.user">
					<span :class="$style.username">
						<n8n-text  color="text-light">{{currentUser.fullName}}</n8n-text>
					</span>
					<n8n-avatar :name="currentUser.fullName" size="large" />
				</div>
			</div>
			<div>
				<div :class="$style.sectionHeader">
					<n8n-heading size="large">{{ $locale.baseText('BASIC_INFORMATION') }}</n8n-heading>
				</div>
				<n8n-form-inputs
					v-if="formInputs"
					:inputs="formInputs"
					:eventBus="formBus"
					@input="onInput"
					@ready="onReadyToSubmit"
					@submit="onSubmit"
				/>
			</div>
			<div>
				<div :class="$style.sectionHeader">
					<n8n-heading size="large">{{ $locale.baseText('SECURITY') }}</n8n-heading>
				</div>
				<div>
					<n8n-input-label :label="$locale.baseText('PASSWORD')">
						<n8n-link @click="openPasswordModal">{{ $locale.baseText('CHANGE_PASSWORD') }}</n8n-link>
					</n8n-input-label>
				</div>
			</div>
			<div>
				<n8n-button float="right" :label="$locale.baseText('SAVE')" size="large" :disabled="!hasAnyChanges || !readyToSubmit" @click="onSaveClick" />
			</div>
		</div>
	</SettingsView>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';
import { CHANGE_PASSWORD_MODAL_KEY } from '@/constants';
import { IFormInputs, IUser } from '@/Interface';
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
			formInputs: null as null | IFormInputs,
			formBus: new Vue(),
			readyToSubmit: false,
		};
	},
	mounted() {
		this.formInputs = [
			{
				name: 'firstName',
				initialValue: this.currentUser.firstName,
				properties: {
					label: this.$locale.baseText('FIRST_NAME'),
					maxlength: 32,
					required: true,
					autocomplete: 'given-name',
				},
			},
			{
				name: 'lastName',
				initialValue: this.currentUser.lastName,
				properties: {
					label: this.$locale.baseText('LAST_NAME'),
					maxlength: 32,
					required: true,
					autocomplete: 'family-name',
				},
			},
			{
				name: 'email',
				initialValue: this.currentUser.email,
				properties: {
					label: this.$locale.baseText('EMAIL'),
					type: 'email',
					required: true,
					validationRules: [{name: 'VALID_EMAIL'}],
					autocomplete: 'email',
				},
			},
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
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
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
					title: this.$locale.baseText('PERSONAL_SETTINGS_UPDATED_SUCCESS'),
					message: '',
					type: 'success',
				});
				this.hasAnyChanges = false;
			}
			catch (e) {
				this.$showError(e, this.$locale.baseText('PERSONAL_SETTINGS_UPDATE_ERROR'));
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

