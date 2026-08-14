<script setup lang="ts">
import {
	N8nBreadcrumbs,
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { DropdownMenuItemProps, PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

interface SessionOption {
	id: string;
	title: string;
	disabled?: boolean;
	label?: string;
	when?: string;
}

interface SessionOptionData {
	when?: string;
}

const props = defineProps<{
	agentName: string;
	agentHref: string;
	sessionTitle: string;
	sessionOptions: SessionOption[];
	hasTrace: boolean;
}>();

const emit = defineEmits<{
	back: [];
	'new-session': [];
	'session-select': [sessionId: string];
	'view-trace': [];
}>();

const i18n = useI18n();

const breadcrumbItems = computed<PathItem[]>(function getBreadcrumbItems() {
	return [
		{
			id: 'agent',
			label: props.agentName,
			href: props.agentHref,
		},
	];
});

function goToSessionTrace() {
	emit('view-trace');
}

const sessionDropdownOptions = computed<Array<DropdownMenuItemProps<string, SessionOptionData>>>(
	function getSessionDropdownOptions() {
		return props.sessionOptions.map(function mapSessionOption(option) {
			return {
				id: option.id,
				label: option.label ?? option.title,
				disabled: option.disabled,
				data: { when: option.when },
			};
		});
	},
);
</script>

<template>
	<header :class="$style.header" data-testid="agent-preview-page-header">
		<div :class="$style.titleGroup">
			<N8nBreadcrumbs
				:items="breadcrumbItems"
				theme="medium"
				:highlight-last-item="false"
				@item-selected="emit('back')"
			>
				<template #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<N8nDropdownMenu
						:items="sessionDropdownOptions"
						placement="bottom-start"
						:extra-popper-class="$style.sessionDropdownMenu"
						data-testid="agent-preview-session-switcher"
						@select="emit('session-select', $event)"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="small"
								:class="$style.sessionTitle"
								:aria-label="i18n.baseText('agentSessions.sessionName')"
							>
								<span :class="$style.sessionTitleLabel">{{
									props.sessionTitle || i18n.baseText('agents.builder.chat.newChat.label')
								}}</span>
								<N8nIcon icon="chevron-down" color="text-light" :size="12" />
							</N8nButton>
						</template>
						<template #item-label="{ item }">
							<N8nText bold :class="$style.sessionDropdownName">{{
								item.label ?? 'New session'
							}}</N8nText>
						</template>
						<template #item-trailing="{ item }">
							<N8nText v-if="item.data?.when" :class="$style.sessionDropdownDate">
								{{ item.data.when }}
							</N8nText>
						</template>
					</N8nDropdownMenu>
				</template>
			</N8nBreadcrumbs>
		</div>

		<div :class="$style.actions">
			<N8nTooltip
				v-if="props.hasTrace"
				:content="i18n.baseText('agents.builder.preview.viewSession')"
			>
				<N8nIconButton
					icon="list-tree"
					variant="ghost"
					size="medium"
					:aria-label="i18n.baseText('agents.builder.preview.viewSession')"
					data-testid="agent-preview-view-trace"
					@click="goToSessionTrace"
				/>
			</N8nTooltip>
			<N8nButton
				variant="subtle"
				size="medium"
				icon="message-circle-plus"
				:label="i18n.baseText('agents.builder.chat.newChat.label')"
				data-testid="agent-preview-new-chat-btn"
				@click="emit('new-session')"
			/>
		</div>
	</header>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--4xl);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.titleGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
}

.sessionTitle {
	transform: translateY(1px);
	min-width: 0;
	max-width: 40rem;
	padding-inline: var(--spacing--2xs);
}
.sessionTitleLabel,
.sessionDropdownName {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.crumbSeparator {
	color: var(--border-color);
	margin-inline: var(--spacing--4xs);
	user-select: none;
	font-size: var(--font-size--xl);
}

.sessionTitleLabel {
	font-size: var(--font-size--sm);
}

.sessionDropdownMenu {
	width: max(var(--reka-dropdown-menu-trigger-width), 16rem);
}

.sessionDropdownName {
	max-width: 80%;
}

.sessionDropdownDate {
	margin-left: auto;
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	white-space: nowrap;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
