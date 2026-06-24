<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';

import { CHROME_EXTENSION_URL } from './constants';

const CONNECT_URL_REFRESH_MARGIN_MS = 30_000;

const props = defineProps<{ modalName: string }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();

const isConnected = computed(() => store.browserConnected);
const connectUrl = ref<string | null>(null);
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function clearRefreshTimer(): void {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = undefined;
	}
}

async function refreshConnectUrl(): Promise<void> {
	clearRefreshTimer();
	connectUrl.value = await store.fetchBrowserConnectUrl();

	const expiresAt = store.browserConnectUrlExpiresAt;
	if (!connectUrl.value || !expiresAt) return;

	const delay = Date.parse(expiresAt) - Date.now() - CONNECT_URL_REFRESH_MARGIN_MS;
	if (!Number.isFinite(delay) || delay <= 0) return;

	refreshTimer = setTimeout(() => void refreshConnectUrl(), delay);
}

onMounted(() => {
	void store.fetchBrowserStatus();
	if (!store.browserConnected) {
		void refreshConnectUrl();
	}
});

onBeforeUnmount(() => {
	clearRefreshTimer();
	store.clearBrowserConnectUrl();
});
</script>

<template>
	<Modal
		:name="props.modalName"
		:show-close="true"
		custom-class="instance-ai-browser-use-setup-modal"
		width="540"
	>
		<template #content>
			<div :class="$style.body">
				<div :class="$style.header">
					<N8nHeading tag="h2" size="large" :class="$style.title">
						{{ i18n.baseText('instanceAi.browserUse.modal.title') }}
					</N8nHeading>
				</div>

				<template v-if="isConnected">
					<div :class="$style.statusRow">
						<span :class="[$style.statusDot, $style.statusDotConnected]" />
						<N8nText size="small" :bold="true">
							{{ i18n.baseText('instanceAi.browserUse.connected') }}
						</N8nText>
					</div>
					<N8nText color="text-light" :class="$style.description">
						{{ i18n.baseText('instanceAi.browserUse.connected.description') }}
					</N8nText>
				</template>

				<template v-else>
					<N8nText color="text-light" :class="$style.description">
						{{ i18n.baseText('instanceAi.browserUse.modal.description') }}
					</N8nText>

					<div :class="$style.step">
						<N8nText :bold="true" size="small">
							{{ i18n.baseText('instanceAi.browserUse.step.extension.title') }}
						</N8nText>
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('instanceAi.browserUse.step.extension.description') }}
						</N8nText>
						<N8nButton
							:label="i18n.baseText('instanceAi.browserUse.step.extension.cta')"
							:href="CHROME_EXTENSION_URL"
							target="_blank"
							variant="outline"
							size="medium"
							icon="external-link"
							data-test-id="browser-use-install-extension"
						/>
					</div>

					<div :class="$style.step">
						<N8nText :bold="true" size="small">
							{{ i18n.baseText('instanceAi.browserUse.step.connect.title') }}
						</N8nText>
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('instanceAi.browserUse.step.connect.description') }}
						</N8nText>
						<N8nButton
							:label="i18n.baseText('instanceAi.browserUse.step.connect.cta')"
							:href="connectUrl ?? undefined"
							target="_blank"
							variant="solid"
							size="medium"
							icon="external-link"
							:disabled="!connectUrl"
							data-test-id="browser-use-open-connect-page"
						/>
					</div>

					<div :class="$style.waitingRow">
						<N8nIcon icon="spinner" color="primary" spin size="small" />
						<span>{{ i18n.baseText('instanceAi.browserUse.step.extension.waiting') }}</span>
					</div>
				</template>
			</div>
		</template>
	</Modal>
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

.description {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.step {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--color--background--light-2);
	border-radius: var(--radius);
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

.waitingRow {
	display: flex;
	font-size: var(--font-size--2xs);
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px 14px;
	background: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
	border-radius: var(--radius);
}
</style>

<style lang="scss">
.instance-ai-browser-use-setup-modal {
	.el-dialog__header {
		padding: 0;
		margin: 0;
	}
	.el-dialog__body {
		padding: 0;
	}
}
</style>
