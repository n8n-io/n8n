<script setup lang="ts">
import { N8nButton, N8nLogo } from '@n8n/design-system';
import { useConnection } from './composables/useConnection';
import StatusBadge from './components/StatusBadge.vue';
import TabList from './components/TabList.vue';
import SettingsPanel from './components/SettingsPanel.vue';

const {
	status,
	tabs,
	selectedTabIds,
	errorMessage,
	settings,
	hasRelayUrl,
	controlledTabs,
	controlledTabIds,
	allSelected,
	someSelected,
	toggleTab,
	toggleAll,
	connect,
	disconnect,
	updateSettings,
} = useConnection();
</script>

<template>
	<div class="container">
		<h1 class="title">
			<N8nLogo class="logo" size="small" :collapsed="false" />
			<span class="title-text">Browser Use</span>
		</h1>
		<p class="subtitle">Let n8n AI control your browser</p>

		<StatusBadge :status="status" :tab-count="controlledTabIds.length" />

		<template v-if="status !== 'connected'">
			<template v-if="hasRelayUrl">
				<TabList
					v-if="tabs.length"
					:tabs="tabs"
					selectable
					:selected-tab-ids="selectedTabIds"
					:all-selected="allSelected"
					@toggle-tab="toggleTab"
					@toggle-all="toggleAll"
				/>
				<N8nButton
					class="full-width"
					size="large"
					:disabled="status === 'connecting'"
					@click="connect"
				>
					Connect{{
						someSelected
							? ` (${selectedTabIds.size} tab${selectedTabIds.size !== 1 ? 's' : ''})`
							: ''
					}}
				</N8nButton>
			</template>
			<p v-else class="info-text">
				Waiting for n8n AI to connect. Ask n8n AI to open your browser to get started.
			</p>
		</template>

		<template v-else>
			<TabList v-if="controlledTabs.length" :tabs="controlledTabs" header-text="Controlled Tabs" />
			<N8nButton class="full-width" variant="outline" size="large" @click="disconnect"
				>Disconnect</N8nButton
			>
		</template>

		<SettingsPanel :settings="settings" @update-settings="updateSettings" />

		<p v-if="errorMessage" class="error">{{ errorMessage }}</p>
	</div>
</template>

<style scoped lang="scss">
.container {
	max-width: 500px;
	width: 100%;
	margin: 0 auto;
	padding: var(--spacing--xl);
	background: var(--background--surface);
	border-radius: var(--radius--xl);
	box-shadow: var(--shadow--light);
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0;
}

.logo {
	:deep(svg) {
		margin-left: 0;
		width: auto;
		height: 2.4em;
	}
}

.title-text {
	margin-top: 2px;
}

.subtitle {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	margin: 0 0 var(--spacing--lg);
}

.info-text {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color--subtler);
	margin: 0 0 var(--spacing--sm);
}

.full-width {
	width: 100%;
}

.error {
	color: var(--text-color--danger);
	font-size: var(--font-size--xs);
	margin-top: var(--spacing--2xs);
}
</style>

<style>
html {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 100vh;
	padding: var(--spacing--md);
}
</style>
