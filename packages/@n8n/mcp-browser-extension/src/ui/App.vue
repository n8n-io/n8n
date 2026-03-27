<script setup lang="ts">
import { ref, onMounted, computed, watchEffect } from 'vue';
import { createLogger } from '../logger';

const log = createLogger('ui');

type ConnectionStatus = 'disconnected' | 'connected' | 'connecting';

interface TabManagementSettings {
	allowTabCreation: boolean;
	allowTabClosing: boolean;
}

const status = ref<ConnectionStatus>('disconnected');
const controlledTabIds = ref<Array<{ targetId: string; chromeTabId: number }>>([]);
const tabs = ref<chrome.tabs.Tab[]>([]);
const selectedTabIds = ref<Set<number>>(new Set());
const errorMessage = ref('');
const showSettings = ref(false);
const settings = ref<TabManagementSettings>({
	allowTabCreation: true,
	allowTabClosing: false,
});

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

const allSelected = computed(
	() =>
		tabs.value.length > 0 &&
		tabs.value.every((t) => t.id !== undefined && selectedTabIds.value.has(t.id)),
);

const someSelected = computed(() => selectedTabIds.value.size > 0);

const selectAllRef = ref<HTMLInputElement | null>(null);
watchEffect(() => {
	if (selectAllRef.value) {
		selectAllRef.value.indeterminate = someSelected.value && !allSelected.value;
	}
});

function toggleTab(tabId: number): void {
	const next = new Set(selectedTabIds.value);
	if (next.has(tabId)) {
		next.delete(tabId);
	} else {
		next.add(tabId);
	}
	selectedTabIds.value = next;
}

function toggleAll(): void {
	if (allSelected.value) {
		selectedTabIds.value = new Set();
	} else {
		selectedTabIds.value = new Set(tabs.value.filter((t) => t.id !== undefined).map((t) => t.id!));
	}
}

async function loadTabs(): Promise<void> {
	const result = await chrome.runtime.sendMessage({ type: 'getTabs' });
	log.debug('loadTabs response:', typeof result, Array.isArray(result) ? result.length : result);
	tabs.value = Array.isArray(result) ? result : [];
}

async function connect(): Promise<void> {
	if (!relayUrl.value) {
		errorMessage.value = 'No active session. Ask n8n AI to connect to your browser.';
		log.warn('connect: no relay URL available');
		return;
	}

	log.debug('connect: relay URL =', relayUrl.value, 'selectedTabs:', selectedTabIds.value.size);
	status.value = 'connecting';
	errorMessage.value = '';

	const raw = await chrome.runtime.sendMessage({
		type: 'connect',
		relayUrl: relayUrl.value,
		selectedTabIds: [...selectedTabIds.value],
	});
	log.debug('connect response:', raw);
	const result = (raw && typeof raw === 'object' ? raw : { success: false }) as {
		success: boolean;
		error?: string;
	};

	if (result.success) {
		status.value = 'connected';
		await chrome.runtime.sendMessage({ type: 'clearRelayUrl' });
		await refreshStatus();
	} else {
		status.value = 'disconnected';
		errorMessage.value = result.error ?? 'Unknown error';
		log.error('connect failed:', result.error);
	}
}

async function disconnect(): Promise<void> {
	log.debug('disconnect');
	await chrome.runtime.sendMessage({ type: 'disconnect' });
	status.value = 'disconnected';
	controlledTabIds.value = [];
	relayUrl.value = null;
}

async function refreshStatus(): Promise<void> {
	const currentStatus = await chrome.runtime.sendMessage({ type: 'getStatus' });
	log.debug('refreshStatus response:', currentStatus);
	const statusObj = (currentStatus && typeof currentStatus === 'object' ? currentStatus : {}) as {
		connected?: boolean;
		tabIds?: Array<{ targetId: string; chromeTabId: number }>;
	};
	controlledTabIds.value = statusObj.tabIds ?? [];
	await loadTabs();
}

async function updateSettings(partial: Partial<TabManagementSettings>): Promise<void> {
	settings.value = { ...settings.value, ...partial };
	await chrome.runtime.sendMessage({
		type: 'updateSettings',
		settings: settings.value,
	});
}

const relayUrl = ref<string | null>(null);

const hasRelayUrl = computed(() => !!relayUrl.value);

// Listen for status changes and relay URL updates from background script
chrome.runtime.onMessage.addListener(
	(message: {
		type: string;
		relayUrl?: string;
		connected?: boolean;
		tabIds?: Array<{ targetId: string; chromeTabId: number }>;
	}) => {
		if (message.type === 'relayUrlReady' && message.relayUrl) {
			log.debug('relayUrlReady received:', message.relayUrl);
			relayUrl.value = message.relayUrl;
			// A new relay URL means the previous session is gone — reset to disconnected
			if (status.value === 'connected') {
				status.value = 'disconnected';
				controlledTabIds.value = [];
				void loadTabs();
			}
		}
		if (message.type === 'statusChanged') {
			log.debug('statusChanged received:', message.connected, message.tabIds);
			if (message.connected) {
				status.value = 'connected';
				controlledTabIds.value = message.tabIds ?? [];
				void loadTabs();
			} else {
				status.value = 'disconnected';
				controlledTabIds.value = [];
				relayUrl.value = null;
			}
		}
	},
);

onMounted(async () => {
	// Load settings
	const savedSettings = await chrome.runtime.sendMessage({ type: 'getSettings' });
	log.debug('saved settings:', savedSettings);
	if (savedSettings && typeof savedSettings === 'object') {
		settings.value = savedSettings as TabManagementSettings;
	}

	// Load pending relay URL from storage (set by background.ts when Playwright opens connect.html)
	const storedUrl = await chrome.runtime.sendMessage({ type: 'getRelayUrl' });
	log.debug('stored relay URL:', storedUrl);
	if (typeof storedUrl === 'string') {
		relayUrl.value = storedUrl;
	}

	const currentStatus = await chrome.runtime.sendMessage({ type: 'getStatus' });
	log.debug('initial status:', currentStatus);
	const statusObj = (currentStatus && typeof currentStatus === 'object' ? currentStatus : {}) as {
		connected?: boolean;
		tabIds?: Array<{ targetId: string; chromeTabId: number }>;
	};

	if (statusObj.connected) {
		status.value = 'connected';
		controlledTabIds.value = statusObj.tabIds ?? [];
		await loadTabs();
	} else {
		await loadTabs();
	}
});

const controlledTabs = computed(() => {
	const controlled = new Set(controlledTabIds.value.map((t) => t.chromeTabId));
	return tabs.value.filter((t) => t.id !== undefined && controlled.has(t.id));
});
</script>

<template>
	<div class="container">
		<h1 class="title">n8n AI Browser Bridge</h1>
		<p class="subtitle">Let n8n AI control browser tabs</p>

		<div :class="['status', `status--${statusTheme}`]">
			<span class="status-dot" />
			<span>{{ statusLabel }}</span>
			<span v-if="status === 'connected'" class="tab-count"
				>{{ controlledTabIds.length }} tabs</span
			>
		</div>

		<template v-if="status !== 'connected'">
			<template v-if="hasRelayUrl">
				<!-- Tab selection list -->
				<div v-if="tabs.length" class="tab-list-container">
					<div class="tab-list-header">
						<label class="select-all" @click.prevent="toggleAll">
							<input ref="selectAllRef" type="checkbox" :checked="allSelected" />
							<span>Select All ({{ tabs.length }} tabs)</span>
						</label>
					</div>
					<ul class="tab-list">
						<li
							v-for="tab in tabs"
							:key="tab.id"
							class="tab-item tab-item--selectable"
							@click="tab.id !== undefined && toggleTab(tab.id)"
						>
							<input
								type="checkbox"
								:checked="tab.id !== undefined && selectedTabIds.has(tab.id)"
								@click.stop
								@change="tab.id !== undefined && toggleTab(tab.id)"
							/>
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
				</div>
				<button class="btn btn--solid" :disabled="status === 'connecting'" @click="connect">
					Connect{{
						someSelected
							? ` (${selectedTabIds.size} tab${selectedTabIds.size !== 1 ? 's' : ''})`
							: ''
					}}
				</button>
			</template>
			<p v-else class="info-text">
				Waiting for n8n AI to connect. Ask n8n AI to open your browser to get started.
			</p>
		</template>

		<template v-else>
			<!-- Read-only list of controlled tabs -->
			<div v-if="controlledTabs.length" class="tab-list-container">
				<div class="tab-list-header">Controlled Tabs</div>
				<ul class="tab-list">
					<li v-for="tab in controlledTabs" :key="tab.id" class="tab-item">
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
			</div>

			<button class="btn btn--outline" @click="disconnect">Disconnect</button>
		</template>

		<!-- Settings -->
		<div class="settings">
			<button class="settings-toggle" @click="showSettings = !showSettings">
				<svg
					class="settings-icon"
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M6.5 1.75a.75.75 0 011.5 0v.3a2.5 2.5 0 011.4.81l.26-.15a.75.75 0 01.75 1.3l-.26.15a2.5 2.5 0 010 1.63l.26.15a.75.75 0 01-.75 1.3l-.26-.15a2.5 2.5 0 01-1.4.81v.3a.75.75 0 01-1.5 0v-.3a2.5 2.5 0 01-1.4-.81l-.26.15a.75.75 0 01-.75-1.3l.26-.15a2.5 2.5 0 010-1.63l-.26-.15a.75.75 0 01.75-1.3l.26.15A2.5 2.5 0 016.5 2.05v-.3zM7.25 5.5a1 1 0 100-2 1 1 0 000 2z"
						fill="currentColor"
					/>
					<path
						d="M10 9.75a.75.75 0 011.5 0v.3a2.5 2.5 0 011.4.81l.26-.15a.75.75 0 01.75 1.3l-.26.15a2.5 2.5 0 010 1.63l.26.15a.75.75 0 01-.75 1.3l-.26-.15a2.5 2.5 0 01-1.4.81v.3a.75.75 0 01-1.5 0v-.3a2.5 2.5 0 01-1.4-.81l-.26.15a.75.75 0 01-.75-1.3l.26-.15a2.5 2.5 0 010-1.63l-.26-.15a.75.75 0 01.75-1.3l.26.15a2.5 2.5 0 011.4-.81v-.3zM10.75 13.5a1 1 0 100-2 1 1 0 000 2z"
						fill="currentColor"
					/>
				</svg>
				<span>Settings</span>
				<svg
					:class="['chevron', { 'chevron--open': showSettings }]"
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M4 6l4 4 4-4"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>

			<div v-if="showSettings" class="settings-panel">
				<label
					class="setting-row"
					@click.prevent="updateSettings({ allowTabCreation: !settings.allowTabCreation })"
				>
					<span class="setting-label">
						<span class="setting-name">Allow tab creation</span>
						<span class="setting-desc">AI agent can open new browser tabs</span>
					</span>
					<span :class="['toggle', { 'toggle--on': settings.allowTabCreation }]">
						<span class="toggle-thumb" />
					</span>
				</label>

				<label
					class="setting-row"
					@click.prevent="updateSettings({ allowTabClosing: !settings.allowTabClosing })"
				>
					<span class="setting-label">
						<span class="setting-name">Allow tab closing</span>
						<span class="setting-desc">AI agent can close controlled tabs</span>
					</span>
					<span :class="['toggle', { 'toggle--on': settings.allowTabClosing }]">
						<span class="toggle-thumb" />
					</span>
				</label>
			</div>
		</div>

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

.info-text {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
	margin: 0 0 var(--spacing--sm);
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

.tab-count {
	margin-left: auto;
	font-size: var(--font-size--2xs);
}

/* ----- Tab list ----- */

.tab-list-container {
	margin-bottom: var(--spacing--sm);
}

.tab-list-header {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	margin-bottom: var(--spacing--3xs);
}

.tab-list {
	list-style: none;
	padding: 0;
	margin: 0;
	max-height: 300px;
	overflow-y: auto;
}

.tab-item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--lg);
	border: var(--border-width) var(--border-style) transparent;
}

.tab-item--selectable {
	cursor: pointer;

	&:hover {
		background: var(--background--surface--hover);
	}
}

.select-all {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

input[type='checkbox'] {
	accent-color: var(--color--primary);
	cursor: pointer;
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

/* ----- Settings ----- */

.settings {
	margin-top: var(--spacing--md);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	padding-top: var(--spacing--sm);
}

.settings-toggle {
	appearance: none;
	background: none;
	border: none;
	padding: var(--spacing--2xs) 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	width: 100%;

	&:hover {
		color: var(--color--text);
	}
}

.settings-icon {
	width: 14px;
	height: 14px;
}

.chevron {
	width: 12px;
	height: 12px;
	margin-left: auto;
	transition: transform var(--duration--snappy);
}

.chevron--open {
	transform: rotate(180deg);
}

.settings-panel {
	padding: var(--spacing--xs) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.setting-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--background--surface--hover);
	}
}

.setting-label {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.setting-name {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.setting-desc {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}

/* ----- Toggle switch ----- */

.toggle {
	position: relative;
	width: 36px;
	height: 20px;
	min-width: 36px;
	border-radius: 10px;
	background: var(--color--foreground--shade-1);
	transition: background var(--duration--snappy);
	cursor: pointer;
}

.toggle--on {
	background: var(--color--primary);
}

.toggle-thumb {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: white;
	transition: transform var(--duration--snappy);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

	.toggle--on & {
		transform: translateX(16px);
	}
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
