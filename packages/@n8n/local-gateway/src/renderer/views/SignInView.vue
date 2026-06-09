<script setup lang="ts">
import { N8nButton, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';
import { computed, ref } from 'vue';

import type { AuthStatus } from '../../shared/types';

const props = defineProps<{ status: AuthStatus }>();

const CLOUD_SUFFIX = '.app.n8n.cloud';

const useCustomUrl = ref(false);
const slug = ref('');
const customUrl = ref('');
const submitting = ref(false);

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
</style>
