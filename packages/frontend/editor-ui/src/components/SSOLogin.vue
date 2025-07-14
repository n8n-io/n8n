<script lang="ts" setup>
import { useToast } from '@/composables/useToast';
import { useSSOStore } from '@/stores/sso.store';
import { useI18n } from '@n8n/i18n';
import { useRoute } from 'vue-router';

const i18n = useI18n();
const ssoStore = useSSOStore();
const toast = useToast();
const route = useRoute();

/**
 * Validates and sanitizes redirect URLs to prevent Open Redirect attacks
 */
function validateRedirectUrl(redirect: string): string {
	// Security: Handle empty or invalid redirects
	if (!redirect || typeof redirect !== 'string') {
		return '';
	}

	// Security: Trim whitespace and decode URL
	const sanitizedRedirect = decodeURIComponent(redirect.trim());

	// Security: Remove control characters and null bytes
	const cleanRedirect = sanitizedRedirect.replace(/[\x00-\x1F\x7F]/g, '');

	// Security: Limit redirect URL length to prevent DoS
	if (cleanRedirect.length > 2048) {
		console.warn('Redirect URL too long, truncating:', cleanRedirect);
		return cleanRedirect.substring(0, 2048);
	}

	// Security: Block dangerous protocols
	const dangerousProtocols = [
		'javascript:',
		'data:',
		'vbscript:',
		'file:',
		'about:',
		'chrome:',
		'moz-extension:',
		'chrome-extension:',
	];

	for (const protocol of dangerousProtocols) {
		if (cleanRedirect.toLowerCase().startsWith(protocol)) {
			console.warn('Dangerous protocol in redirect URL:', cleanRedirect);
			return '';
		}
	}

	// Security: Block suspicious patterns
	const suspiciousPatterns = [
		/\/\/[^\/]*\.(local|test|dev|localhost)/i, // Local domains
		/\/\/[^\/]*\.(evil|malicious|phish|fake)/i, // Obviously malicious domains
		/\/\/[^\/]*\.(tk|ml|ga|cf|gq)/i, // Free domains often used for phishing
	];

	for (const pattern of suspiciousPatterns) {
		if (pattern.test(cleanRedirect)) {
			console.warn('Suspicious redirect URL pattern detected:', cleanRedirect);
			return '';
		}
	}

	// Security: Only allow same-origin or relative paths
	if (cleanRedirect.startsWith('http')) {
		try {
			const url = new URL(cleanRedirect);
			if (url.origin !== window.location.origin) {
				console.warn('Cross-origin redirect blocked:', cleanRedirect);
				return '';
			}
		} catch {
			console.warn('Invalid redirect URL format:', cleanRedirect);
			return '';
		}
	}

	return cleanRedirect;
}

const onSSOLogin = async () => {
	try {
		// Security: Validate and sanitize the redirect parameter
		const redirectParam = typeof route.query?.redirect === 'string' ? route.query.redirect : '';
		const validatedRedirect = validateRedirectUrl(redirectParam);

		const redirectUrl = ssoStore.isDefaultAuthenticationSaml
			? await ssoStore.getSSORedirectUrl(validatedRedirect)
			: ssoStore.oidc.loginUrl;

		// Security: Final validation of the SSO redirect URL
		if (redirectUrl && validateRedirectUrl(redirectUrl) === redirectUrl) {
			window.location.href = redirectUrl;
		} else {
			console.warn('Invalid SSO redirect URL:', redirectUrl);
			toast.showError(new Error('Invalid redirect URL'), 'Error', 'Invalid redirect URL provided');
		}
	} catch (error) {
		toast.showError(error, 'Error', error.message);
	}
};
</script>

<template>
	<div v-if="ssoStore.showSsoLoginButton" :class="$style.ssoLogin">
		<div :class="$style.divider">
			<span>{{ i18n.baseText('sso.login.divider') }}</span>
		</div>
		<N8nButton
			size="large"
			type="primary"
			outline
			:label="i18n.baseText('sso.login.button')"
			@click="onSSOLogin"
		/>
	</div>
</template>

<style lang="scss" module>
.ssoLogin {
	text-align: center;
}

.divider {
	position: relative;
	text-transform: uppercase;

	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--color-foreground-base);
	}

	span {
		position: relative;
		display: inline-block;
		margin: var(--spacing-2xs) auto;
		padding: var(--spacing-l);
		background: var(--color-background-xlight);
	}
}
</style>
