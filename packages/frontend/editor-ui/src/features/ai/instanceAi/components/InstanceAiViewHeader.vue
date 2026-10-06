<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { N8nCallout, N8nIconButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from '../instanceAi.store';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';
import ChatHistoryDropdownTrigger from '@/features/ai/shared/components/ChatHistoryDropdownTrigger.vue';
import SessionFilesList from '@/features/ai/shared/components/SessionFilesList.vue';
import { getSessionFiles } from '../instanceAi.memory.api';
import InstanceAiThreadList from './InstanceAiThreadList.vue';

const props = withDefaults(
	defineProps<{
		title?: string;
		/** Falls back to the route param when omitted (the full assistant page's own use). */
		threadId?: string;
		/** Passed through to `InstanceAiThreadList` — an embedding host scopes
		 * and disables the shared history instead of routing through it. */
		threadList?: {
			filter?: (thread: InstanceAiThreadSummary) => boolean;
			navigate?: boolean;
			disabled?: boolean;
		};
	}>(),
	{
		title: undefined,
		threadId: undefined,
		threadList: undefined,
	},
);

const emit = defineEmits<{
	select: [threadId: string];
	deleted: [wasActive: boolean];
}>();

const store = useInstanceAiStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const route = useRoute();
const { goToUpgrade } = usePageRedirectionHelper();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();

const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);

// The active thread comes from the `threadId` prop, falling back to the
// `:threadId` route param (INSTANCE_AI_THREAD_VIEW); undefined on the
// empty/new-conversation view, in which case no per-thread total shows.
const activeThreadId = computed(() => {
	if (props.threadId) return props.threadId;
	const id = route.params?.threadId;
	return typeof id === 'string' ? id : undefined;
});

const threadCreditsUsed = computed(() =>
	activeThreadId.value ? store.threadCreditsUsed(activeThreadId.value) : undefined,
);

function handleThreadSelect(threadId: string) {
	emit('select', threadId);
}

const showSessionFiles = computed(() =>
	Boolean(settingsStore.moduleSettings['instance-ai']?.sessionFilesEnabled && activeThreadId.value),
);
const showOutputs = computed(() =>
	Boolean(settingsStore.moduleSettings['instance-ai']?.sandboxEnabled),
);
const sessionFilesOpen = ref(false);
const sessionFilesLoading = ref(false);
const sessionFiles = computed(() =>
	activeThreadId.value ? (store.sessionFilesFor(activeThreadId.value) ?? []) : [],
);

function sessionFileContentHref(fileId: string): string {
	const sessionId = activeThreadId.value ?? '';
	return `${rootStore.restApiContext.baseUrl}/instance-ai/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileId)}/content`;
}

async function loadSessionFiles() {
	if (!activeThreadId.value) return;
	sessionFilesLoading.value = true;
	try {
		const response = await getSessionFiles(rootStore.restApiContext, activeThreadId.value);
		store.setSessionFiles(activeThreadId.value, response.files);
	} catch {
		store.setSessionFiles(activeThreadId.value, []);
	} finally {
		sessionFilesLoading.value = false;
	}
}

async function toggleSessionFiles() {
	sessionFilesOpen.value = !sessionFilesOpen.value;
	if (sessionFilesOpen.value) {
		await loadSessionFiles();
	}
}

watch(activeThreadId, () => {
	sessionFilesOpen.value = false;
});
</script>

<template>
	<div :class="$style.header">
		<div :class="$style.threadHistory">
			<InstanceAiThreadList
				max-height="calc(var(--spacing--5xl) + var(--spacing--4xl) + var(--spacing--3xl))"
				:filter="threadList?.filter"
				:navigate="threadList?.navigate"
				:disabled="threadList?.disabled"
				:active-thread-id="threadId"
				@select="handleThreadSelect"
				@deleted="emit('deleted', $event)"
			>
				<template #trigger>
					<ChatHistoryDropdownTrigger
						:title="props.title"
						data-test-id="instance-ai-sidebar-toggle"
					/>
				</template>
			</InstanceAiThreadList>
		</div>
		<slot name="status" />
		<div :class="$style.headerActions">
			<CreditsSettingsDropdown
				v-if="store.creditsRemaining !== undefined"
				:credits-remaining="store.creditsRemaining"
				:credits-quota="store.creditsQuota"
				:credits-used="threadCreditsUsed"
				:is-low-credits="store.isLowCredits"
				button-size="small"
				@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
			/>
			<div v-if="showSessionFiles" :class="$style.sessionFiles">
				<N8nTooltip
					:content="i18n.baseText('sessionFiles.title')"
					placement="bottom"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nIconButton
						icon="folder"
						variant="ghost"
						size="small"
						icon-size="large"
						data-testid="session-files-toggle"
						:aria-label="i18n.baseText('sessionFiles.title')"
						@click="toggleSessionFiles"
					/>
				</N8nTooltip>
				<div v-if="sessionFilesOpen" :class="$style.sessionFilesPanel">
					<SessionFilesList
						:files="sessionFiles"
						:content-href="sessionFileContentHref"
						:loading="sessionFilesLoading"
						:show-outputs="showOutputs"
					/>
				</div>
			</div>
			<slot name="actions" />
		</div>
	</div>

	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<N8nCallout
		v-if="isReadOnlyEnvironment"
		theme="warning"
		icon="lock"
		:class="$style.readOnlyBanner"
	>
		{{ i18n.baseText('readOnlyEnv.instanceAi.notice') }}
	</N8nCallout>
</template>

<style lang="scss" module>
.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background-color: var(--n8n-ia-header--background, var(--background--surface));
}

.headerActions {
	margin-inline-start: auto;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.threadHistory {
	min-width: 0;
}

.sessionFiles {
	position: relative;
}

.sessionFilesPanel {
	position: absolute;
	right: 0;
	top: 100%;
	z-index: 2;
	width: 280px;
	background-color: var(--color--background--light-2);
	border: var(--border);
}

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
}
</style>
