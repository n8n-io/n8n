<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { N8nCallout, N8nIconButton, N8nTooltip, TOOLTIP_DELAY_MS } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore } from '../instanceAi.store';
import { useSidebarState } from '../instanceAiLayout';
import { INSTANCE_AI_SETTINGS_VIEW } from '../constants';
import CreditsSettingsDropdown from '@/features/ai/assistant/components/Agent/CreditsSettingsDropdown.vue';

const store = useInstanceAiStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const router = useRouter();
const sidebar = useSidebarState();
const { goToUpgrade } = usePageRedirectionHelper();

const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);

function goToSettings() {
	void router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}
</script>

<template>
	<div :class="$style.header">
		<Transition name="sidebar-toggle-fade">
			<span v-if="sidebar.collapsed.value" :class="$style.sidebarToggle">
				<N8nTooltip
					:content="i18n.baseText('instanceAi.sidebar.chatHistory')"
					placement="bottom"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nIconButton
						icon="history"
						variant="ghost"
						size="small"
						icon-size="large"
						data-test-id="instance-ai-sidebar-toggle"
						:aria-label="i18n.baseText('instanceAi.sidebar.chatHistory')"
						@click="sidebar.toggle"
					/>
				</N8nTooltip>
			</span>
		</Transition>
		<slot name="title" />
		<div :class="$style.headerActions">
			<CreditsSettingsDropdown
				v-if="store.creditsRemaining !== undefined"
				:credits-remaining="store.creditsRemaining"
				:credits-quota="store.creditsQuota"
				:is-low-credits="store.isLowCredits"
				@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
			/>
			<N8nIconButton
				icon="cog"
				variant="ghost"
				size="small"
				icon-size="large"
				data-test-id="instance-ai-settings-button"
				@click="goToSettings"
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
	background-color: var(--color--background--light-2);
}

.sidebarToggle {
	display: inline-flex;
}

.headerActions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.readOnlyBanner {
	margin: var(--spacing--xs) var(--spacing--sm) 0;
}
</style>

<style lang="scss">
// Entry-point icon button: fade in slightly after the sidebar has begun
// collapsing, fade out quickly when the sidebar starts opening — so the
// crossover feels intentional rather than abrupt.
.sidebar-toggle-fade-enter-from,
.sidebar-toggle-fade-leave-to {
	opacity: 0;
}

.sidebar-toggle-fade-enter-active {
	transition: opacity 0.15s ease;
}

.sidebar-toggle-fade-leave-active {
	transition: opacity 0.1s ease;
}
</style>
