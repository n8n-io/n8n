<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nCallout, N8nIcon, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
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
		showThreadHistoryLabel: false,
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
						:class="[
							$style.threadHistoryButton,
							{ [$style.threadHistoryButtonCollapsed]: !props.showThreadHistoryLabel },
						]"
						data-test-id="instance-ai-sidebar-toggle"
						:aria-label="i18n.baseText('instanceAi.sidebar.chatHistory')"
					>
						<template #icon>
							<N8nIcon icon="history" size="large" />
						</template>
						<span :class="$style.threadHistoryLabel" :aria-hidden="!props.showThreadHistoryLabel">
							{{ i18n.baseText('instanceAi.sidebar.chatHistory') }}
						</span>
					</N8nButton>
				</N8nTooltip>
			</template>
		</InstanceAiThreadList>
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
@use '@n8n/design-system/css/mixins/motion' as motion;

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background-color: transparent;
}

.headerActions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.threadHistoryButton {
	--thread-history-button-inline-padding: calc((var(--height--sm) - var(--font-size--md)) / 2);

	padding-inline: var(--thread-history-button-inline-padding);
}

.threadHistoryButtonCollapsed {
	overflow: hidden;
}

.threadHistoryLabel {
	display: inline-block;
	max-width: var(--spacing--4xl);
	margin-inline-start: 0;
	overflow: hidden;
	opacity: 1;
	transform: translateX(0);
	transition:
		max-width var(--duration--snappy) var(--easing--ease-in-out),
		margin-inline-start var(--duration--snappy) var(--easing--ease-in-out),
		opacity var(--duration--snappy) var(--easing--ease-in-out),
		transform var(--duration--snappy) var(--easing--ease-in-out);
	@include motion.reduced-motion;
}

.threadHistoryButtonCollapsed .threadHistoryLabel {
	max-width: 0;
	margin-inline-start: calc(var(--spacing--3xs) * -1);
	opacity: 0;
	transform: translateX(calc(var(--spacing--3xs) * -1));
}

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
}
</style>
