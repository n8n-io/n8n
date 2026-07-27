<script setup lang="ts">
import {
	N8nBreadcrumbs,
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nTooltip,
} from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';

const props = defineProps<{
	breadcrumbItems: PathItem[];
	sessionTitle: string;
	sessionId?: string;
	hasSession: boolean;
	sessionOptions: Array<DropdownMenuItemProps<string>>;
}>();

const emit = defineEmits<{
	'breadcrumb-select': [item: PathItem];
	'session-select': [sessionId: string];
	'new-chat': [];
	'close-preview': [];
}>();

const i18n = useI18n();
const router = useRouter();

const agentBreadcrumb = computed(() => props.breadcrumbItems[1]);
const projectBreadcrumb = computed(() => props.breadcrumbItems[0]);
const sessionRoute = computed<RouteLocationRaw | undefined>(() => {
	if (!props.sessionId || !projectBreadcrumb.value || !agentBreadcrumb.value) return undefined;
	return {
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectBreadcrumb.value.id,
			agentId: agentBreadcrumb.value.id,
			threadId: props.sessionId,
		},
	};
});

function openSession() {
	if (!sessionRoute.value) return;
	void router.push(sessionRoute.value);
}

function createNewChat() {
	emit('new-chat');
}

function closePreview() {
	emit('close-preview');
}

useKeybindings({
	'ctrl+shift+;': createNewChat,
	Escape: closePreview,
});
</script>

<template>
	<header :class="$style.header" data-testid="agent-builder-header">
		<div :class="$style.left">
			<N8nBreadcrumbs
				:items="props.breadcrumbItems"
				theme="medium"
				@item-selected="emit('breadcrumb-select', $event)"
			>
				<template #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<N8nDropdownMenu
						:items="props.sessionOptions"
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
									{{ props.sessionTitle }}
								</span>
								<N8nIcon icon="chevron-down" :size="12" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</template>
			</N8nBreadcrumbs>
		</div>
		<div :class="$style.right">
			<N8nTooltip v-if="props.hasSession" placement="bottom" :show-after="500">
				<template #content>
					{{ i18n.baseText('agents.builder.preview.viewSession' as BaseTextKey) }}
				</template>
				<N8nButton
					variant="ghost"
					size="medium"
					icon-size="large"
					icon="list-tree"
					:label="i18n.baseText('agents.builder.preview.viewSession' as BaseTextKey)"
					data-testid="agent-preview-view-session-btn"
					@click="openSession"
				/>
			</N8nTooltip>
			<KeyboardShortcutTooltip
				placement="bottom"
				:label="i18n.baseText('agents.builder.chat.newChat.label')"
				:shortcut="{ metaKey: true, shiftKey: true, keys: [';'] }"
			>
				<N8nButton
					variant="subtle"
					size="medium"
					icon-size="large"
					icon="message-circle-plus"
					:label="i18n.baseText('agents.builder.chat.newChat.label')"
					data-testid="agent-preview-new-chat-btn"
					@click="createNewChat"
				/>
			</KeyboardShortcutTooltip>

			<KeyboardShortcutTooltip
				placement="bottom"
				:label="i18n.baseText('generic.close')"
				:shortcut="{ keys: ['Esc'] }"
			>
				<N8nIconButton
					variant="ghost"
					icon="x"
					size="medium"
					icon-size="large"
					:aria-label="i18n.baseText('agents.builder.preview.close.ariaLabel' as BaseTextKey)"
					data-testid="agent-preview-close-btn"
					@click="closePreview"
				/>
			</KeyboardShortcutTooltip>
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
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.left {
	display: flex;
	align-items: center;
	flex: 0 0 auto;
	min-width: max-content;
}

.left :global(.n8n-breadcrumbs) {
	min-width: max-content;
}

.left :global(.n8n-breadcrumbs [data-test-id='breadcrumbs-item']) {
	display: flex;
	align-items: center;
	min-height: var(--height--md);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.left :global(.n8n-breadcrumbs [data-test-id='breadcrumbs-item'] *) {
	line-height: var(--line-height--sm);
}

.crumbSeparator {
	color: var(--border-color);
	margin-inline: var(--spacing--4xs);
	user-select: none;
	font-size: var(--font-size--xl);
}

.switcherButton {
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.switcherLabel {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--sm);
}

.previewSessionLabel {
	max-width: clamp(320px, 42vw, 640px);
}

.right {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
	white-space: nowrap;
}

.sessionMenu {
	width: min(
		calc(var(--spacing--5xl) + var(--spacing--3xl)),
		calc(100vw - var(--spacing--xl))
	) !important;
	max-height: calc((var(--spacing--xl) * 5) + var(--spacing--xs));
}
</style>
