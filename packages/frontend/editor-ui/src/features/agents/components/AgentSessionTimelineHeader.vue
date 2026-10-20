<script setup lang="ts">
import {
	N8nBreadcrumbs,
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nIconButton,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
	type DropdownMenuItemProps,
	type IconOrEmoji,
	type PathItem,
} from '@n8n/design-system';

import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { SessionTimelineMetadata } from '@/features/agents/types';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';

interface SessionDropdownData {
	date: string;
	active: boolean;
}

const props = defineProps<{
	breadcrumbItems: PathItem[];
	projectIcon: IconOrEmoji;
	sessionTitle: string;
	sessionOptions: Array<DropdownMenuItemProps<string, SessionDropdownData>>;
	showLangsmithExport: boolean;
	langsmithExportLoading: boolean;
	metadata?: SessionTimelineMetadata;
}>();

const emit = defineEmits<{
	'breadcrumb-select': [item: PathItem];
	'session-select': [sessionId: string];
	'langsmith-export': [];
	edit: [];
}>();

const i18n = useI18n();

const breadcrumbItems = computed(() =>
	props.breadcrumbItems.map((item, index) =>
		index === 0 ? { ...item, icon: props.projectIcon } : item,
	),
);
const tokenFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1,
});

const costFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 4,
});
</script>

<template>
	<div :class="$style.topBar">
		<div :class="$style.topBarLeft">
			<N8nBreadcrumbs
				:items="breadcrumbItems"
				theme="medium"
				@item-selected="emit('breadcrumb-select', $event)"
			>
				<template #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<N8nDropdownMenu
						:items="props.sessionOptions"
						placement="bottom-start"
						:extra-popper-class="$style.sessionDropdownMenu"
						data-testid="session-header-switcher"
						@select="emit('session-select', $event)"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="small"
								:class="$style.switcherButton"
								:aria-label="i18n.baseText('agentSessions.sessionName')"
							>
								<span :class="$style.switcherLabel">{{ props.sessionTitle }}</span>
								<N8nIcon icon="chevron-down" :size="12" />
							</N8nButton>
						</template>
						<template #item-label="{ item }">
							<span :class="$style.sessionDropdownName">
								{{ item.label }}
							</span>
						</template>
						<template #item-trailing="{ item }">
							<span v-if="item.data?.date" :class="$style.sessionDropdownDate">
								{{ item.data.date }}
							</span>
						</template>
					</N8nDropdownMenu>
				</template>
			</N8nBreadcrumbs>
		</div>
		<div :class="$style.topBarRight">
			<N8nTooltip
				v-if="props.showLangsmithExport"
				:content="i18n.baseText('agentSessions.langsmithExport.button')"
				placement="bottom"
				:show-after="TOOLTIP_DELAY_MS"
			>
				<N8nIconButton
					icon="bug"
					variant="ghost"
					size="small"
					icon-size="large"
					:loading="props.langsmithExportLoading"
					:aria-label="i18n.baseText('agentSessions.langsmithExport.button')"
					data-testid="agent-session-langsmith-export"
					@click="emit('langsmith-export')"
				/>
			</N8nTooltip>
			<ul
				v-if="metadata"
				:class="$style.descriptionList"
				data-testid="agent-session-timeline-metadata"
			>
				<li v-if="metadata.trigger.label">
					<N8nIcon color="text-light" :icon="metadata.trigger.icon" />
					<N8nText step="xs" bold>{{ metadata.trigger.label }}</N8nText>
				</li>
				<li>
					<N8nIcon color="text-light" icon="hash" />
					<N8nText step="xs" bold>
						{{ tokenFormatter.format(metadata.totalTokens).toUpperCase() }}
						<span :class="$style.innerLabel"
							>(${{ costFormatter.format(metadata.totalCost) }})</span
						>
					</N8nText>
				</li>
				<li>
					<N8nIcon color="text-light" icon="clock" />
					<N8nText step="xs" bold>{{ metadata.durationLabel }}</N8nText>
				</li>
			</ul>

			<N8nButton
				variant="outline"
				icon="pencil"
				size="medium"
				data-testid="agent-session-timeline-edit"
				@click="emit('edit')"
				>{{ i18n.baseText('agentNode.ndv.referenced.editInBuilder') }}</N8nButton
			>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/utils';

.topBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.topBarLeft {
	display: flex;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.topBarLeft :global(.n8n-breadcrumbs) {
	min-width: 0;
}

.topBarLeft :global(.n8n-breadcrumbs [data-test-id='breadcrumbs-item']) {
	display: flex;
	align-items: center;
	height: var(--height--md);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	user-select: none;
	color: var(--text-color--subtler);
	margin-left: auto;
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
}

.switcherLabel {
	display: block;
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionDropdownMenu {
	min-width: 360px;
}

:global(.session-dropdown-item-active),
:global(.session-dropdown-item-active:hover),
:global(.session-dropdown-item-active:focus),
:global(.session-dropdown-item-active[data-highlighted]) {
	background-color: var(--background--active);
}

.sessionDropdownName {
	display: block;
	max-width: 60%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionDropdownDate {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	text-align: right;
	white-space: nowrap;
	margin-left: auto;
}
.descriptionList {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--sm);

	.innerLabel {
		color: var(--text-color--subtler);
	}

	li {
		min-width: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: var(--spacing--2xs);
		height: var(--height--sm);
		font-size: var(--font-size--sm);
		padding-inline: var(--spacing--xs);
		margin-inline: calc(var(--spacing--xs) * -1);
		background-color: transparent;
		border-radius: var(--radius);
		user-select: none;

		:global(.n8n-icon) {
			flex-shrink: 0;
			height: auto;
		}

		:global(.n8n-text) {
			flex: 1;
			@include utils.utils-ellipsis;
		}
	}
}
</style>
