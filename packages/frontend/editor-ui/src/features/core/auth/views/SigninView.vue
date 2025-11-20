<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AuthView from './AuthView.vue';
import MfaView from './MfaView.vue';

import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';

import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';

import type { IFormBoxConfig } from '@/Interface';
import { MFA_AUTHENTICATION_REQUIRED_ERROR_CODE, VIEWS, MFA_FORM } from '@/app/constants';
import type { LoginRequestDto } from '@n8n/api-types';

export type EmailOrLdapLoginIdAndPassword = Pick<
	LoginRequestDto,
	'emailOrLdapLoginId' | 'password'
>;

export type MfaCodeOrMfaRecoveryCode = Pick<LoginRequestDto, 'mfaCode' | 'mfaRecoveryCode'>;

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();

const route = useRoute();
const router = useRouter();

const toast = useToast();
const locale = useI18n();
const telemetry = useTelemetry();

const loading = ref(false);
const showMfaView = ref(false);
const emailOrLdapLoginId = ref('');
const password = ref('');
const reportError = ref(false);

// 自动登录相关状态
const autoLoginMode = ref(false);
const autoLoginMessage = ref('正在自动登录...');

// 访问控制状态
const accessDenied = ref(false);
const accessDeniedMessage = ref('请从后台管理系统跳转登录');

const ldapLoginLabel = computed(() => ssoStore.ldapLoginLabel);
const isLdapLoginEnabled = computed(() => ssoStore.isLdapLoginEnabled);
const emailLabel = computed(() => {
	let label = locale.baseText('auth.email');
	if (isLdapLoginEnabled.value && ldapLoginLabel.value) {
		label = ldapLoginLabel.value;
	}
	return label;
});

const formConfig: IFormBoxConfig = reactive({
	title: locale.baseText('auth.signin'),
	buttonText: locale.baseText('auth.signin'),
	redirectText: locale.baseText('forgotPassword'),
	redirectLink: '/forgot-password',
	inputs: [
		{
			name: 'emailOrLdapLoginId',
			properties: {
				label: emailLabel.value,
				type: 'email',
				required: true,
				...(!isLdapLoginEnabled.value && { validationRules: [{ name: 'VALID_EMAIL' }] }),
				showRequiredAsterisk: false,
				validateOnBlur: false,
				autocomplete: 'email',
				capitalize: true,
				focusInitially: true,
			},
		},
		{
			name: 'password',
			properties: {
				label: locale.baseText('auth.password'),
				type: 'password',
				required: true,
				showRequiredAsterisk: false,
				validateOnBlur: false,
				autocomplete: 'current-password',
				capitalize: true,
			},
		},
	],
});

const onMFASubmitted = async (form: MfaCodeOrMfaRecoveryCode) => {
	await login({
		emailOrLdapLoginId: emailOrLdapLoginId.value,
		password: password.value,
		mfaCode: form.mfaCode,
		mfaRecoveryCode: form.mfaRecoveryCode,
	});
};

const onEmailPasswordSubmitted = async (form: EmailOrLdapLoginIdAndPassword) => {
	await login(form);
};

const isRedirectSafe = () => {
	const redirect = getRedirectQueryParameter();

	// Allow local redirects
	if (redirect.startsWith('/')) {
		return true;
	}

	try {
		// Only allow origin domain redirects
		const url = new URL(redirect);
		return url.origin === window.location.origin;
	} catch {
		return false;
	}
};

const getRedirectQueryParameter = () => {
	let redirect = '';
	if (typeof route.query?.redirect === 'string') {
		redirect = decodeURIComponent(route.query?.redirect);
	}
	return redirect;
};

const login = async (form: LoginRequestDto) => {
	try {
		loading.value = true;
		await usersStore.loginWithCreds({
			emailOrLdapLoginId: form.emailOrLdapLoginId,
			password: form.password,
			mfaCode: form.mfaCode,
			mfaRecoveryCode: form.mfaRecoveryCode,
		});
		loading.value = false;
		await settingsStore.getSettings();

		toast.clearAllStickyNotifications();

		if (settingsStore.isMFAEnforced && !usersStore.currentUser?.mfaAuthenticated) {
			await router.push({ name: VIEWS.PERSONAL_SETTINGS });
			return;
		}

		telemetry.track('User attempted to login', {
			result: showMfaView.value ? 'mfa_success' : 'success',
		});

		if (isRedirectSafe()) {
			const redirect = getRedirectQueryParameter();
			if (redirect.startsWith('http')) {
				window.location.href = redirect;
				return;
			}

			void router.push(redirect);
			return;
		}

		await router.push({ name: VIEWS.HOMEPAGE });
	} catch (error) {
		if (error.errorCode === MFA_AUTHENTICATION_REQUIRED_ERROR_CODE) {
			showMfaView.value = true;
			cacheCredentials(form);
			return;
		}

		telemetry.track('User attempted to login', {
			result: showMfaView.value ? 'mfa_token_rejected' : 'credentials_error',
		});

		if (!showMfaView.value) {
			toast.showError(error, locale.baseText('auth.signin.error'));
			loading.value = false;
			return;
		}

		reportError.value = true;
	}
};

const onBackClick = (fromForm: string) => {
	reportError.value = false;
	if (fromForm === MFA_FORM.MFA_TOKEN) {
		showMfaView.value = false;
		loading.value = false;
	}
};
const onFormChanged = (toForm: string) => {
	if (toForm === MFA_FORM.MFA_RECOVERY_CODE) {
		reportError.value = false;
	}
};
const cacheCredentials = (form: EmailOrLdapLoginIdAndPassword) => {
	emailOrLdapLoginId.value = form.emailOrLdapLoginId;
	password.value = form.password;
};

// 自动登录功能
const performAutoLogin = async (userId: string, userName: string) => {
	try {
		autoLoginMode.value = true;
		loading.value = true;
		autoLoginMessage.value = '正在验证用户信息...';
		// 获取认证密钥（从环境变量或配置中读取）
		const authSecret = import.meta.env.VITE_N8N_EXTERNAL_AUTH_SECRET || 'n8n-secret-key-2025';
		const baseUrl = window.location.origin;
		// 注意：登出逻辑在 guest 中间件中处理
		autoLoginMessage.value = '正在初始化用户...';
		// 处理用户名称：如果提供了 userName，使用它；否则使用默认值
		const createResponse = await fetch(`${baseUrl}/rest/external-auth/create-user`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				userId: userId,
				firstName: userName && userName.trim() ? userName.trim() : 'User',
				lastName: userId.substring(0, 8),
				authSecret: authSecret,
			}),
		});

		if (!createResponse.ok) {
			throw new Error('用户初始化失败');
		}

		// 调用外部登录接口
		autoLoginMessage.value = '正在登录...';
		const loginResponse = await fetch(`${baseUrl}/rest/external-auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				userIdentifier: userId,
				authSecret: authSecret,
			}),
		});

		if (!loginResponse.ok) {
			const error = await loginResponse.json();
			throw new Error(error.message || '登录失败');
		}

		console.log('外部登录接口调用成功，Cookie 已设置');

		// 登录成功，直接跳转到主页
		autoLoginMessage.value = '登录成功，正在跳转...';
		setTimeout(() => {
			window.location.href = baseUrl + '/';
		}, 800);
	} catch (error) {
		console.error('Auto login error:', error);
		autoLoginMode.value = false;
		loading.value = false;
		toast.showError(error as Error, '自动登录失败，请手动登录');
	}
};

// 在组件挂载时检查是否有 userId 参数
onMounted(() => {
	const userId = route.query.userId as string;
	const userName = route.query.userName as string;

	// 检查是否携带了必需的 userId 参数
	if (userId && typeof userId === 'string' && userId.trim()) {
		// 有参数，执行自动登录
		void performAutoLogin(userId.trim(), userName);
	} else {
		// 没有参数，拒绝访问
		accessDenied.value = true;
		autoLoginMode.value = false;
		loading.value = false;
	}
});
</script>

<template>
	<div>
		<!-- 访问被拒绝页面 -->
		<div v-if="accessDenied" :class="$style.accessDeniedContainer">
			<p :class="$style.accessDeniedMessage">{{ accessDeniedMessage }}</p>
		</div>

		<!-- 自动登录 Loading 页面 -->
		<div v-else-if="autoLoginMode" :class="$style.autoLoginContainer">
			<div :class="$style.loadingSpinner"></div>
			<h2 :class="$style.loadingTitle">{{ autoLoginMessage }}</h2>
			<p :class="$style.loadingSubtitle">请稍候，即将自动跳转...</p>
		</div>

		<!-- 禁用原有的登录表单-->
		<AuthView
			v-else-if="!showMfaView"
			:form="formConfig"
			:form-loading="loading"
			:with-sso="true"
			data-test-id="signin-form"
			@submit="onEmailPasswordSubmitted"
		/>
		<MfaView
			v-if="showMfaView"
			:report-error="reportError"
			@submit="onMFASubmitted"
			@on-back-click="onBackClick"
			@on-form-changed="onFormChanged"
		/>
	</div>
</template>

<style lang="scss" module>
.accessDeniedContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: var(--spacing-2xl);
	text-align: center;
}

.warningIcon {
	width: 80px;
	height: 80px;
	color: #ff6b6b;
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.8;
		transform: scale(1.05);
	}
}

.accessDeniedTitle {
	font-size: 28px;
	font-weight: 700;
	color: #2c3e50;
	margin: 0 0 var(--spacing-m) 0;
}

.accessDeniedMessage {
	font-size: 18px;
	color: #34495e;
	margin: 0 0 var(--spacing-xl) 0;
	font-weight: 500;
}

// 自动登录样式
.autoLoginContainer {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	color: 333333;
}

.loadingSpinner {
	border: 4px solid rgba(255, 255, 255, 0.3);
	border-radius: 50%;
	border-top: 4px solid white;
	width: 50px;
	height: 50px;
	animation: spin 1s linear infinite;
	margin-bottom: var(--spacing-l);
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.loadingTitle {
	font-size: 24px;
	font-weight: 600;
	margin: 0 0 var(--spacing-xs) 0;
}

.loadingSubtitle {
	font-size: 14px;
	opacity: 0.9;
	margin: 0;
}
</style>
