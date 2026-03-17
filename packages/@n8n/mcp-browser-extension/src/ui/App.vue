<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

type ConnectionStatus = 'disconnected' | 'connected' | 'connecting';

const status = ref<ConnectionStatus>('disconnected');
const tabs = ref<chrome.tabs.Tab[]>([]);
const selectedTabId = ref<number>();
const errorMessage = ref('');

const statusTheme = computed(() => {
	const map: Record<ConnectionStatus, string> = {
		connected: 'success',
		connecting: 'warning',
		disconnected: 'danger',
	};
	return map[status.value];
});

const statusLabel = computed(() => {
	const map: Record<ConnectionStatus, string> = {
		connected: 'Connected',
		connecting: 'Connecting...',
		disconnected: 'Disconnected',
	};
	return map[status.value];
});

async function loadTabs(): Promise<void> {
	const result = (await chrome.runtime.sendMessage({ type: 'getTabs' })) as chrome.tabs.Tab[];
	tabs.value = result;
	selectedTabId.value = undefined;
}

function selectTab(tabId: number): void {
	selectedTabId.value = tabId;
}

async function connect(): Promise<void> {
	if (!selectedTabId.value) return;

	const params = new URLSearchParams(window.location.search);
	const relayUrl = params.get('mcpRelayUrl');

	if (!relayUrl) {
		errorMessage.value = 'No relay URL provided. This page should be opened by n8n automatically.';
		return;
	}

	status.value = 'connecting';
	errorMessage.value = '';

	const result = (await chrome.runtime.sendMessage({
		type: 'connect',
		relayUrl,
		tabId: selectedTabId.value,
	})) as { success: boolean; error?: string };

	if (result.success) {
		status.value = 'connected';
	} else {
		status.value = 'disconnected';
		errorMessage.value = result.error ?? 'Unknown error';
	}
}

async function disconnect(): Promise<void> {
	await chrome.runtime.sendMessage({ type: 'disconnect' });
	status.value = 'disconnected';
	await loadTabs();
}

onMounted(async () => {
	const currentStatus = (await chrome.runtime.sendMessage({ type: 'getStatus' })) as {
		connected: boolean;
		tabId?: number;
	};

	if (currentStatus.connected) {
		status.value = 'connected';
	} else {
		await loadTabs();

		const params = new URLSearchParams(window.location.search);
		const relayUrl = params.get('mcpRelayUrl');
		const autoTabId = params.get('tabId');

		if (relayUrl && autoTabId) {
			selectedTabId.value = Number(autoTabId);
			void connect();
		}
	}
});
</script>

<template>
	<div class="container">
		<h1 class="title">n8n Browser Bridge</h1>
		<p class="subtitle">Share a browser tab with n8n's AI agent</p>

		<div :class="['status', `status--${statusTheme}`]">
			<span class="status-dot" />
			<span>{{ statusLabel }}</span>
		</div>

		<template v-if="status !== 'connected'">
			<ul v-if="tabs.length" class="tab-list">
				<li
					v-for="tab in tabs"
					:key="tab.id"
					:class="['tab-item', { 'tab-item--selected': tab.id === selectedTabId }]"
					@click="selectTab(tab.id!)"
				>
					<img
						v-if="tab.favIconUrl"
						:src="tab.favIconUrl"
						alt=""
						class="tab-favicon"
						@error="($event.target as HTMLImageElement).style.display = 'none'"
					/>
					<div class="tab-info">
						<div class="tab-title">{{ tab.title ?? 'Untitled' }}</div>
						<div class="tab-url">{{ tab.url ?? '' }}</div>
					</div>
				</li>
			</ul>

			<button class="btn btn--solid" :disabled="!selectedTabId" @click="connect">
				Connect Selected Tab
			</button>
		</template>

		<template v-else>
			<button class="btn btn--outline" @click="disconnect">Disconnect</button>
		</template>

		<button class="btn btn--ghost refresh-btn" @click="loadTabs">Refresh Tabs</button>

		<p v-if="errorMessage" class="error">{{ errorMessage }}</p>
	</div>
</template>

<style scoped lang="scss">
/* ----- Layout ----- */

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
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	margin: 0 0 var(--spacing--2xs);
}

.subtitle {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
	margin: 0 0 var(--spacing--lg);
}

/* ----- Status indicator ----- */

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--lg);
	margin-bottom: var(--spacing--md);
	font-size: var(--font-size--sm);
}

.status--success {
	background: var(--background--success);
	color: var(--text-color--success);
}

.status--warning {
	background: var(--background--warning);
	color: var(--text-color--warning);
}

.status--danger {
	background: var(--background--danger);
	color: var(--text-color--danger);
}

.status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: currentcolor;
}

/* ----- Tab list ----- */

.tab-list {
	list-style: none;
	padding: 0;
	margin: 0 0 var(--spacing--sm);
	max-height: 300px;
	overflow-y: auto;
}

.tab-item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background var(--duration--snappy);
	border: var(--border-width) var(--border-style) transparent;

	&:hover {
		background: var(--background--surface--hover);
	}
}

.tab-item--selected {
	background: var(--color--primary--tint-3);
	border-color: var(--color--primary--tint-1);
}

.tab-favicon {
	width: 16px;
	height: 16px;
	border-radius: var(--radius--sm);
}

.tab-info {
	flex: 1;
	min-width: 0;
}

.tab-title {
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tab-url {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ----- Buttons (mirrors @n8n/design-system N8nButton) ----- */

.btn {
	appearance: none;
	touch-action: manipulation;
	-webkit-tap-highlight-color: transparent;
	user-select: none;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: var(--font-weight--medium, 500);
	white-space: nowrap;
	cursor: pointer;
	text-decoration: none;
	border: none;
	line-height: 1;

	// Large size
	height: var(--height--lg);
	padding: 0 var(--spacing--sm);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--sm);

	--btn-bg: transparent;
	--btn-bg-hover: transparent;
	--btn-bg-active: transparent;
	--btn-color: light-dark(var(--color--neutral-900), var(--color--neutral-100));
	--btn-shadow: 0 0 0 0 transparent;
	--btn-shadow-hover: 0 0 0 0 transparent;
	--btn-border: 0 0 0 0 transparent;
	--btn-border-hover: 0 0 0 0 transparent;
	--btn-border-active: 0 0 0 0 transparent;

	background-color: var(--btn-bg);
	color: var(--btn-color);
	box-shadow:
		inset var(--btn-border),
		var(--btn-shadow);

	&:hover {
		background-color: var(--btn-bg-hover);
		box-shadow:
			inset var(--btn-border-hover),
			var(--btn-shadow-hover);
	}

	&:active {
		background-color: var(--btn-bg-active);
		box-shadow:
			inset var(--btn-border-active),
			var(--btn-shadow);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
		transition: outline 0.15s ease-out;
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.btn--solid {
	--btn-bg: var(--color--orange-400);
	--btn-bg-hover: var(--color--orange-500);
	--btn-bg-active: var(--color--orange-600);
	--btn-color: var(--color--neutral-white);
	--btn-shadow: 0 1px 3px 0 light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200));
	--btn-shadow-hover: 0 1px 3px 0
		light-dark(var(--color--black-alpha-100), var(--color--black-alpha-200));
	--btn-border: 0 0 0 1px var(--color--orange-400);
	--btn-border-hover: 0 0 0 1px var(--color--orange-500);
	--btn-border-active: 0 0 0 1px var(--color--orange-600);
}

.btn--outline {
	--btn-bg: transparent;
	--btn-bg-hover: light-dark(var(--color--neutral-150), var(--color--white-alpha-100));
	--btn-bg-active: light-dark(var(--color--black-alpha-200), var(--color--white-alpha-200));
	--btn-border: 0 0 0 1px light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	--btn-border-hover: 0 0 0 1px
		light-dark(var(--color--black-alpha-200), var(--color--white-alpha-200));
	--btn-border-active: 0 0 0 1px
		light-dark(var(--color--black-alpha-300), var(--color--white-alpha-300));
}

.btn--ghost {
	--btn-bg: transparent;
	--btn-bg-hover: light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100));
	--btn-bg-active: light-dark(var(--color--black-alpha-200), var(--color--white-alpha-200));
}

.refresh-btn {
	margin-top: var(--spacing--2xs);
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
