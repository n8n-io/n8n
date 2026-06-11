<script setup lang="ts">
import { N8nButton, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { CLOUD_SUFFIX, toSignInPrefill } from './sign-in-prefill';
import type { AuthStatus, LocalInstanceStatus } from '../../shared/types';

const props = defineProps<{ status: AuthStatus }>();

const i18n = useI18n();

const useCustomUrl = ref(false);
const slug = ref('');
const customUrl = ref('');
const submitting = ref(false);

// Prefill from the last signed-in instance. A watcher rather than initial ref values:
// the initial auth status is fetched async, so the remembered URL can arrive after
// mount. Never clobber anything the user has already typed.
watch(
	() => props.status.lastInstanceUrl,
	(lastInstanceUrl) => {
		if (slug.value || customUrl.value) return;
		const prefill = toSignInPrefill(lastInstanceUrl);
		if (!prefill) return;
		useCustomUrl.value = prefill.kind === 'custom';
		if (prefill.kind === 'cloud') slug.value = prefill.slug;
		else customUrl.value = prefill.url;
	},
	{ immediate: true },
);

/** The fully-qualified instance URL, composed from whichever input mode is active. */
const instanceUrl = computed(() =>
	useCustomUrl.value ? customUrl.value.trim() : `https://${slug.value.trim()}${CLOUD_SUFFIX}`,
);

const canSubmit = computed(() =>
	useCustomUrl.value ? customUrl.value.trim().length > 0 : slug.value.trim().length > 0,
);

// Stay in a loading state from the click until the browser round-trip resolves.
const loading = computed(() => submitting.value || props.status.state === 'authorizing');
const errorMessage = computed(() => (props.status.state === 'error' ? props.status.error : null));

function toggleInputMode() {
	useCustomUrl.value = !useCustomUrl.value;
}

async function signIn() {
	if (!canSubmit.value || loading.value) return;
	submitting.value = true;
	try {
		await window.electronAPI.signIn(instanceUrl.value);
	} finally {
		// The browser flow continues out-of-band; `status` drives the UI from here.
		submitting.value = false;
	}
}

// Embedded local instance: status is pushed by the main process while it spawns
// n8n and signs in headlessly; success lands as a regular `signedIn` auth status.
const localStatus = ref<LocalInstanceStatus | null>(null);
let unsubscribeLocalStatus: (() => void) | null = null;

onMounted(() => {
	unsubscribeLocalStatus = window.electronAPI.onLocalInstanceStatusChanged((status) => {
		localStatus.value = status;
	});
	void window.electronAPI.getLocalInstanceStatus().then((status) => {
		localStatus.value = status;
	});
});

onBeforeUnmount(() => unsubscribeLocalStatus?.());

const localStarting = computed(() => localStatus.value?.state === 'starting');
const localError = computed(() =>
	localStatus.value?.state === 'error' ? localStatus.value.error : null,
);

async function signInLocal() {
	if (localStarting.value || loading.value) return;
	await window.electronAPI.signInLocal();
}
</script>

<template>
	<main :class="$style.container">
		<N8nHeading tag="h1" size="xlarge" bold>n8n Assistant</N8nHeading>
		<N8nText :class="$style.subtitle" color="text-light"> Sign in to n8n to get started. </N8nText>

		<div :class="$style.field">
			<div v-if="!useCustomUrl" :class="$style.cloudField">
				<N8nText color="text-light">https://</N8nText>
				<N8nInput
					v-model="slug"
					:class="$style.slugInput"
					placeholder="your-workspace"
					autofocus
					data-testid="signin-slug"
					@keydown.enter="signIn"
				/>
				<N8nText color="text-light">{{ CLOUD_SUFFIX }}</N8nText>
			</div>
			<N8nInput
				v-else
				v-model="customUrl"
				type="text"
				placeholder="https://n8n.example.com"
				autofocus
				data-testid="signin-url"
				@keydown.enter="signIn"
			/>
		</div>

		<div :class="$style.actions">
			<N8nButton
				:class="$style.submit"
				size="large"
				:loading="loading"
				:disabled="!canSubmit"
				@click="signIn"
			>
				Sign in
			</N8nButton>
			<N8nText v-if="errorMessage" :class="$style.error" color="danger" size="small">
				{{ errorMessage }}
			</N8nText>
			<button type="button" :class="$style.linkButton" @click="toggleInputMode">
				<N8nText size="small" color="text-light">
					{{ useCustomUrl ? 'Use n8n Cloud instead' : 'Self-hosting? Enter URL manually' }}
				</N8nText>
			</button>
		</div>

		<div :class="$style.localSection">
			<N8nButton
				type="secondary"
				size="large"
				:class="$style.submit"
				:loading="localStarting"
				:disabled="loading"
				data-testid="signin-local"
				@click="signInLocal"
			>
				{{ i18n.baseText('desktopAssistant.signIn.local.cta') }}
			</N8nButton>
			<N8nText v-if="localStarting" size="small" color="text-light">
				{{ i18n.baseText('desktopAssistant.signIn.local.starting') }}
			</N8nText>
			<N8nText v-else-if="localError" :class="$style.error" color="danger" size="small">
				{{ localError }}
			</N8nText>
		</div>
	</main>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--xl);
	text-align: center;
}

.subtitle {
	margin-bottom: var(--spacing--lg);
}

.field {
	width: 100%;
	max-width: 360px;
}

.cloudField {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
}

.slugInput {
	flex: 1;
}

.actions {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--3xs);
	width: 100%;
	max-width: 360px;
	margin-top: var(--spacing--lg);
}

/* Block-level primary action — N8nButton doesn't stretch under align-items: stretch. */
.submit {
	width: 100%;
}

.error {
	text-align: center;
}

/* Subordinate link: right-aligned with the button, just below it. Styling comes from
   the inner N8nText (a bare <button> is bold per the design-system reset). */
.linkButton {
	align-self: flex-end;
	padding: var(--spacing--4xs) 0;
	background: none;
	border: none;
	cursor: pointer;
}

.linkButton:hover {
	/* Brighten the label on hover by overriding the var N8nText's "text-light" reads. */
	--text-color--subtler: var(--text-color);
}

.localSection {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--3xs);
	width: 100%;
	max-width: 360px;
	margin-top: var(--spacing--lg);
	padding-top: var(--spacing--lg);
	border-top: var(--border);
}
</style>
