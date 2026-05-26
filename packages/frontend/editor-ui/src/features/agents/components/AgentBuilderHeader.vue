<script setup lang="ts">
/**
 * Top header bar for the agent builder. Hosts breadcrumb navigation,
 * agent switcher, publish button, and the existing action-menu dropdown.
 *
 * Navigation intents are emitted as events, except for the project breadcrumb
 * which links back to the owning project/personal page.
 */
import { computed, onMounted } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import {
	N8nActionDropdown,
	N8nBreadcrumbs,
	N8nButton,
	N8nDropdownMenu,
	N8nDropdownMenuItem,
	N8nIcon,
	N8nTooltip,
} from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types/action-dropdown';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { NEW_AGENT_VIEW } from '@/features/agents/constants';

import AgentPublishButton from './AgentPublishButton.vue';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import type { AgentResource } from '../types';

const props = defineProps<{
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
	projectName: string | null;
	headerActions: Array<ActionDropdownItem<string>>;
	saveStatus?: 'idle' | 'saving' | 'saved';
	mode?: 'edit' | 'preview';
	currentSessionTitle?: string;
	sessionOptions?: Array<DropdownMenuItemProps<string>>;
	beforeRevertToPublished?: () => Promise<void> | void;
	isVersionHistoryOpen?: boolean;
}>();

const emit = defineEmits<{
	'header-action': [item: string];
	'open-preview': [];
	'new-chat': [];
	'close-preview': [];
	'session-select': [sessionId: string];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	reverted: [agent: AgentResource];
	'switch-agent': [agentId: string];
	'toggle-version-history': [];
}>();

const i18n = useI18n();
const router = useRouter();

const { list: agentsList, ensureLoaded } = useProjectAgentsList(computed(() => props.projectId));
const sessionMenuMaxHeight = 'calc((var(--spacing--xl) * 5) + var(--spacing--xs))';

onMounted(() => {
	void ensureLoaded();
});

const projectRoute = computed<RouteLocationRaw>(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: props.projectId },
}));

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: props.projectId,

		label: props.projectName ?? i18n.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
]);

const agentDisplayName = computed(() => props.agent?.name ?? '…');
const isPreview = computed(() => props.mode === 'preview');
const isPreviewDisabled = computed(() => props.agent?.isRunnable !== true);
const previewDisabledTooltip = computed(() =>
	i18n.baseText('agents.builder.preview.disabledTooltip' as BaseTextKey),
);
const sessionTitle = computed(
	() => props.currentSessionTitle ?? i18n.baseText('agents.builder.chat.newChat.label'),
);
const sessionOptions = computed<Array<DropdownMenuItemProps<string>>>(() => {
	if (props.sessionOptions && props.sessionOptions.length > 0) return props.sessionOptions;
	return [
		{
			id: '__empty__',
			label: i18n.baseText('agents.builder.chat.sessionPicker.empty'),
			disabled: true,
		},
	];
});

const switcherOptions = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const list = agentsList.value ?? [];
	const others = list.filter((a) => a.id !== props.agentId);
	if (others.length === 0) {
		return [
			{
				id: '__empty__',
				label: i18n.baseText('agents.builder.header.switcher.empty'),
				disabled: true,
			},
		];
	}
	return others.map((a) => ({
		id: a.id,
		label: a.name,
	}));
});

function onSwitcherSelect(id: string) {
	if (id === '__empty__') return;
	emit('switch-agent', id);
}

function onCreateAgent() {
	void router.push({ name: NEW_AGENT_VIEW, query: { projectId: props.projectId } });
}

function onBreadcrumbSelect(item: PathItem) {
	if (item.id !== props.projectId) return;
	void router.push(projectRoute.value);
}

function onOpenPreview() {
	if (isPreviewDisabled.value) return;
	emit('open-preview');
}

// Disabled until the agent has at least one publish history row. The flag
// is set by the backend (see AgentsService.hasPublishHistory) so it stays
// true after an unpublish, when activeVersionId is null but rows persist.
const isVersionHistoryDisabled = computed(() => !props.agent?.hasPublishHistory);
</script>

<template>
	<header :class="$style.header" data-testid="agent-builder-header">
		<div :class="$style.left">
			<N8nBreadcrumbs :items="breadcrumbItems" theme="medium" @item-selected="onBreadcrumbSelect">
				<template #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<N8nDropdownMenu
						:items="switcherOptions"
						placement="bottom-start"
						data-testid="agent-header-switcher"
						@select="onSwitcherSelect"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="xsmall"
								:class="$style.switcherButton"
								:aria-label="i18n.baseText('agents.builder.header.switcher.ariaLabel')"
							>
								<span :class="[$style.switcherLabel, $style.agentSwitcherLabel]">
									{{ agentDisplayName }}
								</span>
								<N8nIcon icon="chevron-down" :size="12" />
							</N8nButton>
						</template>
						<template #footer>
							<div :class="$style.switcherFooter">
								<N8nDropdownMenuItem
									id="__new_agent__"
									:label="i18n.baseText('agents.builder.header.switcher.newAgent')"
									:icon="{ type: 'icon', value: 'plus' }"
									test-id="agent-header-new-agent"
									@select="onCreateAgent"
								/>
							</div>
						</template>
					</N8nDropdownMenu>
					<template v-if="isPreview">
						<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
						<N8nDropdownMenu
							:items="sessionOptions"
							:max-height="sessionMenuMaxHeight"
							:extra-popper-class="$style.sessionMenu"
							placement="bottom-start"
							data-testid="agent-preview-session-picker"
							@select="emit('session-select', $event)"
						>
							<template #trigger>
								<N8nButton
									variant="ghost"
									size="small"
									:class="$style.switcherButton"
									:aria-label="i18n.baseText('agents.builder.chat.sessionPicker.ariaLabel')"
								>
									<span :class="[$style.switcherLabel, $style.previewSessionLabel]">
										{{ sessionTitle }}
									</span>
									<N8nIcon icon="chevron-down" :size="12" />
								</N8nButton>
							</template>
						</N8nDropdownMenu>
					</template>
				</template>
			</N8nBreadcrumbs>
		</div>
		<div :class="$style.right">
			<template v-if="isPreview">
				<N8nButton
					variant="outline"
					size="medium"
					icon="plus"
					data-testid="agent-preview-new-chat-btn"
					@click="emit('new-chat')"
				>
					{{ i18n.baseText('agents.builder.chat.newChat.label') }}
				</N8nButton>
				<N8nButton
					variant="ghost"
					icon-only
					size="medium"
					:aria-label="i18n.baseText('agents.builder.preview.close.ariaLabel' as BaseTextKey)"
					data-testid="agent-preview-close-btn"
					@click="emit('close-preview')"
				>
					<N8nIcon icon="x" :size="16" />
				</N8nButton>
			</template>
			<template v-else>
				<span
					v-if="saveStatus === 'saving' || saveStatus === 'saved'"
					:class="$style.saveStatus"
					data-testid="agent-header-save-status"
				>
					{{
						saveStatus === 'saving'
							? i18n.baseText('agents.builder.header.saving')
							: i18n.baseText('agents.builder.header.saved')
					}}
				</span>
				<N8nTooltip :disabled="!isPreviewDisabled" :content="previewDisabledTooltip">
					<N8nButton
						variant="ghost"
						size="medium"
						icon="play"
						:disabled="isPreviewDisabled"
						data-testid="agent-header-preview-btn"
						@click="onOpenPreview"
					>
						{{ i18n.baseText('agents.builder.preview.button' as BaseTextKey) }}
					</N8nButton>
				</N8nTooltip>
				<AgentPublishButton
					:agent="agent"
					:project-id="projectId"
					:agent-id="agentId"
					:is-saving="saveStatus === 'saving'"
					:before-revert-to-published="beforeRevertToPublished"
					@published="(a: AgentResource) => emit('published', a)"
					@unpublished="(a: AgentResource) => emit('unpublished', a)"
					@reverted="(a: AgentResource) => emit('reverted', a)"
				/>
				<N8nTooltip placement="bottom">
					<template #content>
						<span v-if="isVersionHistoryDisabled">
							{{ i18n.baseText('agents.versionHistory.button.tooltip.empty') }}
						</span>
						<span v-else>
							{{ i18n.baseText('agents.versionHistory.button.tooltip') }}
						</span>
					</template>
					<N8nButton
						variant="ghost"
						size="medium"
						icon="history"
						icon-only
						:active="isVersionHistoryOpen"
						:disabled="isVersionHistoryDisabled"
						:aria-label="i18n.baseText('agents.versionHistory.button.ariaLabel')"
						data-testid="agent-header-version-history-btn"
						@click="emit('toggle-version-history')"
					/>
				</N8nTooltip>
				<N8nActionDropdown
					v-if="headerActions.length > 0"
					:items="headerActions"
					activator-icon="ellipsis"
					activator-size="medium"
					data-testid="agent-header-actions"
					@select="(item: string) => emit('header-action', item)"
				/>
			</template>
		</div>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.left {
	display: flex;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.left :global(.n8n-breadcrumbs) {
	min-width: 0;
}

.left :global(.n8n-breadcrumbs [data-test-id='breadcrumbs-item'] *) {
	line-height: var(--line-height--lg);
}

.crumbSeparator {
	color: var(--border-color);
	margin: 0 var(--spacing--4xs);
	user-select: none;
}

.switcherButton {
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
	line-height: var(--line-height--lg);
}

.switcherLabel {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--lg);
}

.agentSwitcherLabel {
	max-width: 240px;
}

.previewSessionLabel {
	max-width: clamp(320px, 42vw, 640px);
}

.switcherFooter {
	border-top: var(--border);
	padding: var(--spacing--3xs);
}

.right {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.saveStatus {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	user-select: none;
}

.sessionMenu {
	width: min(
		calc(var(--spacing--5xl) + var(--spacing--3xl)),
		calc(100vw - var(--spacing--xl))
	) !important;
}
</style>
