<template>
	<div class="auth-page">
		<!-- Brand on top -->
		<div class="auth-brand">
			<img :src="albertsonsLogo" alt="Albertsons" class="auth-logo" />
			<span class="auth-brand-text">Albertsons AI Agent Space</span>
		</div>

		<!-- Card -->
		<div class="auth-card">
			<h2 class="auth-card-title">
				{{ isLogin ? 'Sign in' : 'Create account' }}
			</h2>

			<form @submit.prevent="handleSubmit" class="auth-form">
				<!-- Email -->
				<div class="field">
					<label class="field-label">Email</label>
					<input v-model="email" type="email" placeholder="you@company.com" class="field-input" />
				</div>

				<!-- Password -->
				<div class="field">
					<label class="field-label">Password</label>
					<input v-model="password" type="password" placeholder="••••••••" class="field-input" />
				</div>

				<!-- Confirm password -->
				<div v-if="!isLogin" class="field">
					<label class="field-label">Confirm password</label>
					<input
						v-model="confirmPassword"
						type="password"
						placeholder="••••••••"
						class="field-input"
					/>
				</div>

				<!-- Error -->
				<p v-if="error" class="error-text">
					{{ error }}
				</p>

				<!-- Submit -->
				<button type="submit" class="primary-button">
					{{ isLogin ? 'Sign in' : 'Create account' }}
				</button>
			</form>

			<!-- Forgot -->
			<button v-if="isLogin" class="link-button mt-12" type="button">Forgot my password</button>

			<!-- Divider -->
			<div class="divider"></div>

			<!-- Toggle -->
			<div class="toggle-text">
				<span v-if="isLogin">
					Don’t have an account?
					<button type="button" @click="toggleMode" class="link-inline">Create an account</button>
				</span>
				<span v-else>
					Already have an account?
					<button type="button" @click="toggleMode" class="link-inline">Sign in</button>
				</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import albertsonsLogo from '../assets/albertsons-logo.png';

const isLogin = ref(true);
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');

const toggleMode = () => {
	isLogin.value = !isLogin.value;
	error.value = '';
	password.value = '';
	confirmPassword.value = '';
};

const handleSubmit = () => {
	error.value = '';

	if (!email.value || !password.value) {
		error.value = 'Please fill in all fields';
		return;
	}

	if (!isLogin.value && password.value !== confirmPassword.value) {
		error.value = 'Passwords do not match';
		return;
	}

	alert(isLogin.value ? 'Signed in' : 'Account created');
};
</script>

<style scoped>
.auth-page {
	min-height: 100vh;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

/* top logo + text */
.auth-brand {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 32px;
}

.auth-logo {
	height: 32px;
}

.auth-brand-text {
	font-size: 18px;
	font-weight: 600;
	color: #3f82ff; /* blue */
}

/* card */
.auth-card {
	width: 100%;
	max-width: 380px;
	background: #ffffff;
	border-radius: 16px;
	padding: 28px 32px 24px;
	border: 1px solid #e5e7eb;
	box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
	text-align: center;
}

.auth-card-title {
	font-size: 20px;
	font-weight: 600;
	color: #111827;
	margin-bottom: 24px;
}

/* form fields */
.auth-form {
	display: flex;
	flex-direction: column;
	gap: 14px;
	text-align: left;
}

.field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.field-label {
	font-size: 13px;
	color: #374151;
}

.field-input {
	padding: 9px 11px;
	border-radius: 8px;
	border: 1px solid #d1d5db;
	font-size: 14px;
	background: #e5f0ff; /* light blue like screenshot */
}

.field-input:focus {
	outline: none;
	border-color: #2563eb;
	box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
}

/* error text */
.error-text {
	font-size: 13px;
	color: #b91c1c;
	text-align: center;
}

/* primary button */
.primary-button {
	margin-top: 6px;
	width: 100%;
	padding: 9px 0;
	border-radius: 999px;
	border: none;
	background: #3f82ff;
	color: #ffffff;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
}

.primary-button:hover {
	background: #3f82ff;
}

/* links / footer */
.link-button {
	margin-top: 10px;
	background: transparent;
	border: none;
	font-size: 13px;
	color: #59a4ff;
	cursor: pointer;
}

.divider {
	margin: 18px 0 12px;
	border-top: 1px solid #e5e7eb;
}

.toggle-text {
	font-size: 13px;
	color: #4b5563;
}

.link-inline {
	background: transparent;
	border: none;
	color: #3068e0;
	font-weight: 500;
	margin-left: 4px;
	cursor: pointer;
}
</style>
