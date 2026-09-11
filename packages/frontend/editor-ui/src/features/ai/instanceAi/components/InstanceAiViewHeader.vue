<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nCallout, N8nIcon, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from '../instanceAi.store';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';
import InstanceAiThreadList from './InstanceAiThreadList.vue';

const props = withDefaults(
	defineProps<{
		showThreadHistoryLabel?: boolean;
	}>(),
	{
		showThreadHistoryLabel: false,
	},
);

const store = useInstanceAiStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const route = useRoute();
const { goToUpgrade } = usePageRedirectionHelper();
const threadMenuOpen = ref(false);

const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);

// The active thread comes from the `:threadId` route param (INSTANCE_AI_THREAD_VIEW);
// undefined on the empty/new-conversation view, in which case no per-thread total shows.
const activeThreadId = computed(() => {
	const id = route.params?.threadId;
	return typeof id === 'string' ? id : undefined;
});

const threadCreditsUsed = computed(() =>
	activeThreadId.value ? store.threadCreditsUsed(activeThreadId.value) : undefined,
);
</script>

<template>
	<div :class="$style.header">
		<N8nPopover
			v-model:open="threadMenuOpen"
			side="bottom"
			align="start"
			:side-offset="4"
			width="calc(var(--spacing--5xl) + var(--spacing--3xl) + var(--spacing--xl))"
			:enable-scrolling="false"
			:content-class="$style.threadHistoryPopover"
		>
			<template #trigger>
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
			</template>
			<template #content>
				<InstanceAiThreadList
					max-height="calc(var(--spacing--5xl) + var(--spacing--4xl) + var(--spacing--3xl))"
					:max-threads="50"
					@close="threadMenuOpen = false"
					@select="threadMenuOpen = false"
				/>
			</template>
		</N8nPopover>
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
	background-color: var(--color--background--light-2);
}

.headerActions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.threadHistoryPopover {
	overflow: hidden;
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
