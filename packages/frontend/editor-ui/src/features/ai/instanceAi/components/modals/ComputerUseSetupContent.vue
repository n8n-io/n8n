<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nCallout, N8nHeading, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import MacOsIcon from '../../assets/os-icons/macos-icon.svg';
import WindowsIcon from '../../assets/os-icons/windows-icon.svg';
import LinuxIcon from '../../assets/os-icons/linux-icon.svg';

const CATEGORY_META: Record<string, { icon: IconName; labelKey: BaseTextKey }> = {
	filesystem: { icon: 'folder-open', labelKey: 'instanceAi.filesystem.category.filesystem' },
	browser: { icon: 'globe', labelKey: 'instanceAi.filesystem.category.browser' },
	screenshot: { icon: 'mouse-pointer', labelKey: 'instanceAi.filesystem.category.computerUse' },
	'mouse-keyboard': {
		icon: 'mouse-pointer',
		labelKey: 'instanceAi.filesystem.category.computerUse',
	},
	shell: { icon: 'terminal', labelKey: 'instanceAi.filesystem.category.shell' },
};

const i18n = useI18n();
const store = useInstanceAiSettingsStore();

const selectedOs = ref<'mac' | 'windows' | 'linux'>('mac');
const copied = ref(false);
const isScrolledToEnd = ref(false);

const osTabs = [
	{
		id: 'mac' as const,
		labelKey: 'instanceAi.welcomeModal.gateway.os.mac' as const,
		icon: MacOsIcon,
	},
	{
		id: 'windows' as const,
		labelKey: 'instanceAi.welcomeModal.gateway.os.windows' as const,
		icon: WindowsIcon,
	},
	{
		id: 'linux' as const,
		labelKey: 'instanceAi.welcomeModal.gateway.os.linux' as const,
		icon: LinuxIcon,
	},
];

const displayCommand = computed(() => store.setupCommand ?? 'npx @n8n/computer-use');
const canCopyCommand = computed(() => store.setupCommand !== null);
const nowMs = ref(Date.now());

let expiryTimer: ReturnType<typeof setInterval> | null = null;

const tokenExpiresInSeconds = computed(() => {
	if (store.setupCommandTtlSeconds !== null && store.setupCommandFetchedAt !== null) {
		const elapsedSeconds = Math.floor((nowMs.value - store.setupCommandFetchedAt) / 1000);
		return Math.max(0, store.setupCommandTtlSeconds - elapsedSeconds);
	}
	return null;
});

const tokenExpiryText = computed(() => {
	if (tokenExpiresInSeconds.value === null) return null;
	if (tokenExpiresInSeconds.value === 0) {
		return i18n.baseText('instanceAi.welcomeModal.gateway.tokenExpired');
	}
	const minutes = Math.max(1, Math.ceil(tokenExpiresInSeconds.value / 60));
	return i18n.baseText('instanceAi.welcomeModal.gateway.tokenExpiresIn', {
		interpolate: { minutes: String(minutes) },
	});
});

const terminalInstructionsKey = computed(() => {
	if (selectedOs.value === 'windows') return 'instanceAi.welcomeModal.gateway.instructions.windows';
	if (selectedOs.value === 'linux') return 'instanceAi.welcomeModal.gateway.instructions.linux';
	return 'instanceAi.welcomeModal.gateway.instructions.mac';
});

const copyCommandAriaLabel = computed(() =>
	copied.value ? i18n.baseText('generic.copiedToClipboard') : i18n.baseText('generic.copy'),
);

const displayCategories = computed(() => {
	const seen = new Set<string>();
	const result: Array<{
		key: string;
		icon: IconName;
		label: string;
		enabled: boolean;
		sublabel?: string;
	}> = [];

	for (const cat of store.gatewayToolCategories) {
		const meta = CATEGORY_META[cat.name];
		if (!meta) continue;
		const labelKey = meta.labelKey;

		if (seen.has(labelKey)) {
			if (cat.enabled) {
				const existing = result.find((r) => r.label === i18n.baseText(labelKey));
				if (existing) existing.enabled = true;
			}
			continue;
		}
		seen.add(labelKey);

		let sublabel: string | undefined;
		if (cat.name === 'filesystem' && cat.enabled) {
			sublabel = cat.writeAccess
				? i18n.baseText('instanceAi.filesystem.access.readWrite')
				: i18n.baseText('instanceAi.filesystem.access.read');
		}

		result.push({
			key: cat.name,
			icon: meta.icon,
			label: i18n.baseText(labelKey),
			enabled: cat.enabled,
			sublabel,
		});
	}
	return result.sort((a, b) => Number(b.enabled) - Number(a.enabled));
});

function onCommandScroll(e: Event) {
	const el = e.target as HTMLElement;
	isScrolledToEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
}

async function copyCommand() {
	try {
		if (tokenExpiresInSeconds.value === 0) {
			await store.fetchSetupCommand();
		}
		if (!store.setupCommand) return;
		await navigator.clipboard.writeText(store.setupCommand);
		copied.value = true;
		setTimeout(() => {
			copied.value = false;
		}, 2000);
	} catch {
		// Ignore clipboard errors
	}
}

// Fetch the paste-ready setup command from the server. No daemon calls here —
// the local daemon is only contacted when the user clicks Connect.
onMounted(() => {
	void store.fetchSetupCommand();
});

watch(
	() => [store.setupCommandFetchedAt, store.setupCommandTtlSeconds] as const,
	([fetchedAt, ttlSeconds]) => {
		if (expiryTimer) {
			clearInterval(expiryTimer);
			expiryTimer = null;
		}
		if (!(fetchedAt !== null && ttlSeconds !== null)) return;
		nowMs.value = Date.now();
		expiryTimer = setInterval(() => {
			nowMs.value = Date.now();
		}, 1000);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	if (expiryTimer) clearInterval(expiryTimer);
	store.clearSetupCommand();
});
</script>

<template>
	<div :class="$style.body">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="large" :class="$style.title">
				{{ i18n.baseText('instanceAi.welcomeModal.gateway.title') }}
			</N8nHeading>
		</div>

		<template v-if="store.isGatewayConnected">
			<div :class="$style.connectedBlock">
				<div :class="$style.statusRow">
					<span :class="[$style.statusDot, $style.statusDotConnected]" />
					<N8nText size="small" :bold="true">
						{{ store.gatewayHostIdentifier ?? store.gatewayDirectory }}
					</N8nText>
				</div>
				<div
					v-if="store.gatewayHostIdentifier && store.gatewayDirectory"
					:class="$style.directoryRow"
				>
					<N8nText size="small" color="text-light">
						{{ store.gatewayDirectory }}
					</N8nText>
				</div>
				<div v-if="displayCategories.length" :class="$style.toolCategories">
					<span
						v-for="cat in displayCategories"
						:key="cat.key"
						:class="[$style.categoryPill, !cat.enabled && $style.categoryPillDisabled]"
					>
						<N8nIcon :icon="cat.icon" size="xsmall" />
						{{ cat.label }}
						<span v-if="cat.sublabel" :class="$style.categorySublabel"> ({{ cat.sublabel }}) </span>
					</span>
				</div>
			</div>
		</template>

		<template v-else>
			<div
				v-n8n-html="i18n.baseText('instanceAi.welcomeModal.gateway.description')"
				:class="$style.textBlock"
			/>

			<N8nCallout theme="warning">
				{{ i18n.baseText('instanceAi.welcomeModal.gateway.warning') }}
			</N8nCallout>

			<div :class="$style.osTabs">
				<button
					v-for="tab in osTabs"
					:key="tab.id"
					:class="[$style.osTab, { [$style.osTabActive]: selectedOs === tab.id }]"
					@click="selectedOs = tab.id"
				>
					<component :is="tab.icon" :class="$style.osTabIcon" />
					<span>{{ i18n.baseText(tab.labelKey) }}</span>
				</button>
			</div>

			<N8nText :class="$style.instructions">
				{{ i18n.baseText(terminalInstructionsKey) }}
			</N8nText>

			<div :class="$style.commandCard">
				<div :class="$style.commandRow">
					<code
						:class="[$style.commandText, { [$style.commandTextFaded]: !isScrolledToEnd }]"
						@scroll="onCommandScroll"
						>{{ displayCommand }}</code
					>
					<N8nIconButton
						:icon="copied ? 'check' : 'copy'"
						variant="ghost"
						size="small"
						icon-size="large"
						:class="$style.copyButton"
						:aria-label="copyCommandAriaLabel"
						data-test-id="computer-use-setup-copy-command"
						:disabled="!canCopyCommand"
						@click="copyCommand"
					/>
				</div>
				<div :class="$style.waitingRow">
					<div :class="$style.waitingStatus">
						<N8nIcon icon="spinner" color="primary" spin size="small" />
						<span>{{ i18n.baseText('instanceAi.welcomeModal.gateway.waiting') }}</span>
					</div>
					<N8nText v-if="tokenExpiryText" size="small" color="warning">
						{{ tokenExpiryText }}
					</N8nText>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--xl);
}

.textBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
}

.osTabs {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--4xs);
	gap: var(--spacing--4xs);
	background: var(--color--foreground);
}

.osTab {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius);
	padding: var(--spacing--2xs);
	background: transparent;
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	opacity: 0.7;
}

.osTabActive {
	background: var(--color--background--light-2);
	color: var(--color--text);
	opacity: 1;
}

.osTabIcon {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
}

.commandCard {
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.commandRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--neutral-950);
}

.commandText {
	color: var(--color--neutral-300);
	white-space: nowrap;
	overflow: auto;
	font-size: var(--font-size--xs);
	font-family: monospace;

	&::-webkit-scrollbar {
		display: none;
	}
	-ms-overflow-style: none;
	scrollbar-width: none;
}

.commandTextFaded {
	mask-image: linear-gradient(to right, black calc(100% - 24px), transparent 100%);
}

.copyButton {
	flex-shrink: 0;
	color: var(--color--neutral-300);
}

.connectedBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.statusDot {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	flex-shrink: 0;
}

.statusDotConnected {
	background: var(--color--success);
}

.directoryRow {
	padding-left: calc(var(--spacing--2xs) + var(--spacing--3xs));
}

.toolCategories {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	padding-left: calc(var(--spacing--2xs) + var(--spacing--3xs));
}

.categoryPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.categoryPillDisabled {
	opacity: 0.4;
}

.categorySublabel {
	color: var(--color--text--tint-1);
}

.waitingRow {
	display: flex;
	font-size: var(--font-size--2xs);
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border);
	color: var(--color--text--tint-1);
}

.waitingStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.instructions {
	margin-top: var(--spacing--2xs);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
}
</style>
