<script setup lang="ts">
import { N8nBreadcrumbs, N8nButton, N8nDropdownMenu, N8nIcon } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';

const props = defineProps<{
	breadcrumbItems: PathItem[];
	sessionTitle: string;
	sessionId?: string;
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

useKeybindings({
	'ctrl+shift+;': createNewChat,
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
			<N8nButton
				variant="ghost"
				size="medium"
				icon="list-tree"
				:disabled="!sessionRoute"
				data-testid="agent-preview-view-session-btn"
				@click="openSession"
			>
				View session
			</N8nButton>
			<N8nButton
				variant="subtle"
				size="medium"
				icon="plus"
				data-testid="agent-preview-new-chat-btn"
				@click="createNewChat"
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

.previewSessionLabel {
	max-width: clamp(320px, 42vw, 640px);
}

.right {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.sessionMenu {
	width: min(
		calc(var(--spacing--5xl) + var(--spacing--3xl)),
		calc(100vw - var(--spacing--xl))
	) !important;
	max-height: calc((var(--spacing--xl) * 5) + var(--spacing--xs));
}
</style>
