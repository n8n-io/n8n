<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

const i18n = useI18n();

const emit = defineEmits<{ back: [] }>();

const loggingOut = ref(false);

async function logOut() {
	if (loggingOut.value) return;
	loggingOut.value = true;
	try {
		// Auth state flips to `signedOut`, so App.vue swaps back to the sign-in view.
		await window.electronAPI.signOut();
	} finally {
		loggingOut.value = false;
	}
}
</script>

<template>
	<section :class="$style.settings">
		<div :class="$style.titleBar">
			<N8nIconButton
				icon="arrow-left"
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('desktopAssistant.settings.back')"
				@click="emit('back')"
			/>
			<N8nText bold>{{ i18n.baseText('desktopAssistant.settings.title') }}</N8nText>
		</div>

		<div :class="$style.content">
			<N8nButton variant="outline" :loading="loggingOut" @click="logOut">
				{{ i18n.baseText('desktopAssistant.settings.logout') }}
			</N8nButton>
		</div>
	</section>
</template>

<style module>
.settings {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 0;
}

.titleBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}
</style>
