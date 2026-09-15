<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { N8nButton, N8nHeading, N8nLogo, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { VIEWS } from '@/app/constants';

const usersStore = useUsersStore();
const {
	settings: { releaseChannel },
} = useSettingsStore();

const locale = useI18n();
const toast = useToast();
const router = useRouter();

const loading = ref(false);
const ready = ref(false);
const newEmail = ref('');
const isActive = ref(true);

onBeforeUnmount(() => {
	isActive.value = false;
});

const getToken = () => {
	const { token } = router.currentRoute.value.query;
	return typeof token === 'string' && token.length > 0 ? token : null;
};

const onConfirm = async () => {
	const token = getToken();
	if (!token) return;

	try {
		loading.value = true;
		await usersStore.confirmEmailChange({ token });
	} catch (error) {
		toast.showError(error, locale.baseText('auth.confirmEmailChange.error'));
		loading.value = false;
		return;
	}

	toast.showMessage({
		type: 'success',
		title: locale.baseText('auth.confirmEmailChange.success.title'),
		message: locale.baseText('auth.confirmEmailChange.success.message'),
	});

	// The email changed, so end the session and send the user to sign in.
	try {
		await usersStore.logout();
	} catch {
		// A failed logout must not strand the confirmed user. If they are still
		// on this view, force a full reload to sign-in so local session state
		// resets and the /signin guard passes. Skip it if they already left.
		if (isActive.value) {
			window.location.href = router.resolve({ name: VIEWS.SIGNIN }).href;
		}
		loading.value = false;
		return;
	}

	// Skip the redirect if the user left the view while logout was pending.
	if (isActive.value) {
		await router.push({ name: VIEWS.SIGNIN });
	}
	loading.value = false;
};

onMounted(async () => {
	const token = getToken();
	if (!token) {
		toast.showError(
			new Error(locale.baseText('auth.confirmEmailChange.missingTokenError')),
			locale.baseText('auth.confirmEmailChange.error'),
		);
		void router.replace({ name: VIEWS.SIGNIN });
		return;
	}

	try {
		// The mutating step runs on confirm, so an email-scanner GET of this link
		// only resolves the token here and never applies the change.
		const resolved = await usersStore.resolveEmailChangeToken({ token });
		// The user may leave this view while the resolve is pending; skip the
		// continuation so it never toasts or navigates from a new destination.
		if (!isActive.value) return;
		newEmail.value = resolved.email;
		ready.value = true;
	} catch (error) {
		if (!isActive.value) return;
		toast.showError(error, locale.baseText('auth.confirmEmailChange.tokenValidationError'));
		void router.replace({ name: VIEWS.SIGNIN });
	}
});
</script>

<template>
	<div :class="$style.container">
		<N8nLogo size="large" :release-channel="releaseChannel" />
		<div v-if="ready" :class="$style.card" data-test-id="confirm-email-change">
			<N8nHeading size="xlarge">{{ locale.baseText('auth.confirmEmailChange.title') }}</N8nHeading>
			<N8nText color="text-base">
				{{ locale.baseText('auth.confirmEmailChange.message', { interpolate: { newEmail } }) }}
			</N8nText>
			<N8nButton
				:label="locale.baseText('auth.confirmEmailChange.button')"
				:loading="loading"
				size="large"
				data-test-id="confirm-email-change-button"
				@click="onConfirm"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: var(--spacing--2xl);
}

.card {
	margin-top: var(--spacing--xl);
	width: 352px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--xl);
	text-align: center;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 4px 16px rgba(99, 77, 255, 0.06);
}
</style>
