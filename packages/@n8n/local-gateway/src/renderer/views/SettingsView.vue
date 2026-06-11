<script setup lang="ts">
import { N8nButton, N8nHeading, N8nIconButton, N8nText } from '@n8n/design-system';
import { ref } from 'vue';

import type { AuthStatus } from '../../shared/types';

defineProps<{ status: AuthStatus }>();

const emit = defineEmits<{ close: [] }>();

const signingOut = ref(false);

async function signOut() {
	if (signingOut.value) return;
	signingOut.value = true;
	try {
		// The resulting signedOut status arrives via onAuthStatusChanged and swaps the view.
		await window.electronAPI.signOut();
	} finally {
		signingOut.value = false;
	}
}
</script>

<template>
	<main :class="$style.container">
		<div :class="$style.titleRow">
			<N8nIconButton
				icon="arrow-left"
				variant="ghost"
				size="small"
				aria-label="Back"
				data-testid="settings-back"
				@click="emit('close')"
			/>
			<N8nHeading tag="h1" size="large" bold>Settings</N8nHeading>
		</div>

		<section :class="$style.section" aria-labelledby="settings-account-heading">
			<N8nHeading id="settings-account-heading" tag="h2" size="small" bold>Account</N8nHeading>
			<div :class="$style.row">
				<div :class="$style.rowText">
					<N8nText>Signed in</N8nText>
					<N8nText v-if="status.instanceUrl" size="small" color="text-light">
						{{ status.instanceUrl }}
					</N8nText>
				</div>
				<N8nButton
					variant="outline"
					:loading="signingOut"
					data-testid="settings-sign-out"
					@click="signOut"
				>
					Sign out
				</N8nButton>
			</div>
		</section>
	</main>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--md) var(--spacing--md) var(--spacing--xl);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 1px solid var(--da-border);
	border-radius: var(--da-radius);
}

.rowText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.rowText > * {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
