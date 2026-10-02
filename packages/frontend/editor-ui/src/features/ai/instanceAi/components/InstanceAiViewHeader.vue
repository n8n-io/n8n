<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from '../instanceAi.store';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';
import ChatHistoryDropdownTrigger from '@/features/ai/shared/components/ChatHistoryDropdownTrigger.vue';
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

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
}
</style>
