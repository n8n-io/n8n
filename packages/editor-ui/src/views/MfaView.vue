<template>
	<div :class="$style.container">
		<div :class="$style.logoContainer">
			<Logo />
		</div>
		<div :class="$style.headerContainer">
			<n8n-heading tag="h2" size="xlarge" color="text-dark">Enter MFA Token</n8n-heading>
		</div>
		<div>
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
			<n8n-button
				float="right"
				label="Submit"
				size="large"
				:disabled="!hasAnyChanges || !readyToSubmit"
				@click="onSaveClick"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import AuthView from './AuthView.vue';
import { showMessage } from '@/mixins/showMessage';
import Vue from 'vue';

import mixins from 'vue-typed-mixins';
import { IFormInputs } from '@/Interface';

import Logo from '../components/Logo.vue';
import { VIEWS } from '@/constants';
import { useUsersStore } from '@/stores/users';
import { mapStores } from 'pinia';

export default mixins(showMessage).extend({
	name: 'MfaView',
	components: {
		AuthView,
		Logo,
	},
	async mounted() {
		console.log('montando');
		const { email, password } = this.$route.params;
		this.email = email;
		this.password = password;
		this.formInputs = [
			{
				name: 'token',
				initialValue: '',
				properties: {
					label: 'Token',
					maxlength: 20,
					required: true,
					capitalize: true,
				},
			},
		];
	},
	data() {
		return {
			email: '',
			password: '',
			hasAnyChanges: false,
			formBus: new Vue(),
			formInputs: null as null | IFormInputs,
			readyToSubmit: false,
		};
	},
	computed: {
		...mapStores(
			useUsersStore,
		),
	},
	methods: {
		onInput() {
			this.hasAnyChanges = true;
		},
		onReadyToSubmit(ready: boolean) {
			this.readyToSubmit = ready;
		},
		async onSubmit(form: { token: string }) {
			try {
				try {
					await this.usersStore.loginWithCreds({
						email: this.email,
						password: this.password,
						mfaToken: form.token,
					});

				} catch (error) {
					this.$router.push({ name: VIEWS.SIGNIN });
				}
				this.clearAllStickyNotifications();

				if (typeof this.$route.query.redirect === 'string') {
					const redirect = decodeURIComponent(this.$route.query.redirect);
					if (redirect.startsWith('/')) {
						// protect against phishing
						this.$router.push(redirect);

						return;
					}
				}

				this.$router.push({ name: VIEWS.HOMEPAGE });
			} catch (error) {
				this.$showError(error, this.$locale.baseText('auth.signin.error'));
			}
		},
		onSaveClick() {
			this.formBus.$emit('submit');
		},
	},
});
</script>

<style lang="scss" module>
body {
	background-color: var(--color-background-light);
}

.container {
	display: flex;
	align-items: center;
	flex-direction: column;
	padding-top: var(--spacing-2xl);

	> * {
		margin-bottom: var(--spacing-l);
		width: 352px;
	}
}

.logoContainer {
	display: flex;
	justify-content: center;
}

.textContainer {
	text-align: center;
}

.formContainer {
	padding-bottom: var(--spacing-xl);
}

.qrContainer {
	text-align: center;
}

.headerContainer {
	text-align: center;
}
</style>
