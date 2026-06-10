<script setup lang="ts">
import { N8nButton, N8nHeading, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import type { AuthStatus, MacPermissionKind, MacPermissionStatus } from '../../shared/types';

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

// ── macOS permissions ───────────────────────────────────────────────────────
// Surface Accessibility / Screen Recording grant state so the user can fix a
// degraded context picker. The whole section is hidden off macOS.
const permissions = ref<MacPermissionStatus>({
	supported: false,
	accessibility: 'unknown',
	screenRecording: 'unknown',
});

const permissionRows: Array<{ kind: MacPermissionKind; label: string; description: string }> = [
	{
		kind: 'accessibility',
		label: 'Accessibility',
		description: "Detect the app, window and browser tab you're looking at",
	},
	{
		kind: 'screenRecording',
		label: 'Screen Recording',
		description: 'Read window titles and attach screenshots',
	},
];

async function refreshPermissions() {
	permissions.value = await window.electronAPI.getMacPermissions();
}

async function openPermission(kind: MacPermissionKind) {
	await window.electronAPI.openMacPermissionSettings(kind);
}

let disposeActive: (() => void) | undefined;
onMounted(async () => {
	await refreshPermissions();
	// Re-check when the window regains focus, so returning from System Settings
	// flips the status live.
	disposeActive = window.electronAPI.onWindowActiveChanged((active) => {
		if (active) void refreshPermissions();
	});
});
onBeforeUnmount(() => disposeActive?.());
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

		<section
			v-if="permissions.supported"
			:class="$style.section"
			aria-labelledby="settings-permissions-heading"
		>
			<N8nHeading id="settings-permissions-heading" tag="h2" size="small" bold>
				Permissions
			</N8nHeading>
			<div
				v-for="row in permissionRows"
				:key="row.kind"
				:class="$style.row"
				:data-testid="`settings-permission-${row.kind}`"
			>
				<div :class="$style.rowText">
					<N8nText>{{ row.label }}</N8nText>
					<N8nText size="small" color="text-light">{{ row.description }}</N8nText>
				</div>
				<div :class="$style.status">
					<span v-if="permissions[row.kind] === 'granted'" :class="$style.granted">
						<N8nIcon icon="circle-check" :size="16" aria-hidden="true" />
						<N8nText size="small" color="text-light">Granted</N8nText>
					</span>
					<N8nButton
						v-else
						variant="outline"
						size="small"
						:data-testid="`settings-permission-grant-${row.kind}`"
						@click="openPermission(row.kind)"
					>
						Open Settings
					</N8nButton>
				</div>
			</div>
			<N8nText size="small" color="text-light">
				Granting Screen Recording may require restarting the app to take effect.
			</N8nText>
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

.status {
	display: flex;
	flex-shrink: 0;
	align-items: center;
}

.granted {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--da-green);
}

.rowText > * {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
