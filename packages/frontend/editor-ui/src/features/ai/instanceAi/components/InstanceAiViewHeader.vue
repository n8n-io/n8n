<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nCallout, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiThreadSummary } from '@n8n/api-types';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from '../instanceAi.store';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';
import InstanceAiThreadList from './InstanceAiThreadList.vue';

const props = withDefaults(
	defineProps<{
		showThreadHistoryLabel?: boolean;
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
		showThreadHistoryLabel: true,
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
					<N8nTooltip
						as-child
						:content="i18n.baseText('instanceAi.sidebar.chatHistory')"
						:disabled="props.showThreadHistoryLabel"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nButton
							variant="ghost"
							size="small"
							icon="history"
							icon-size="large"
							:icon-only="!props.showThreadHistoryLabel"
							:class="$style.threadHistoryButton"
							data-test-id="instance-ai-sidebar-toggle"
							:aria-label="i18n.baseText('instanceAi.sidebar.chatHistory')"
						>
							<span v-if="props.showThreadHistoryLabel" :class="$style.threadHistoryLabel">
								{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
							</span>
						</N8nButton>
					</N8nTooltip>
				</template>
			</InstanceAiThreadList>
		</div>
		<slot name="title" />
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
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.threadHistory {
	// The dropdown trigger wrapper sets `min-width: 0`. A long title would
	// shrink it and the button would paint over the heading. Keep the button
	// at its content width; the title is the part that truncates.
	flex-shrink: 0;
}

.threadHistoryButton {
	--thread-history-button-inline-padding: calc((var(--height--sm) - var(--font-size--md)) / 2);

	padding-inline: var(--thread-history-button-inline-padding);
}

.threadHistoryLabel {
	// Bound the label so a long translation does not crowd out the title.
	max-width: var(--spacing--4xl);
	overflow: hidden;
	text-overflow: ellipsis;
}

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
}
</style>
