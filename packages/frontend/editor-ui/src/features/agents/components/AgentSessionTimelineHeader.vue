<script setup lang="ts">
import { N8nBreadcrumbs, N8nButton, N8nDropdownMenu, N8nIcon } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n } from '@n8n/i18n';

interface SessionDropdownData {
	date: string;
	active: boolean;
}

const props = defineProps<{
	breadcrumbItems: PathItem[];
	sessionTitle: string;
	sessionOptions: Array<DropdownMenuItemProps<string, SessionDropdownData>>;
	showMetrics: boolean;
	triggerSource: string | null;
	triggerIcon: 'slack' | 'bolt-filled';
	triggerLabel: string;
	totalTokens: number;
	totalCost: number;
	durationLabel: string;
}>();

const emit = defineEmits<{
	'breadcrumb-select': [item: PathItem];
	'session-select': [sessionId: string];
	close: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.topBar">
		<div :class="$style.topBarLeft">
			<N8nBreadcrumbs
				:items="props.breadcrumbItems"
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
		<div v-if="props.showMetrics" :class="$style.topBarRight">
			<span v-if="props.triggerSource" :class="$style.metricItem">
				<N8nIcon :icon="props.triggerIcon" :size="12" />
				<span>{{ props.triggerLabel }}</span>
			</span>
			<span :class="$style.sep">·</span>
			<span :class="$style.metricItem">
				<N8nIcon icon="circle-dollar-sign" :size="12" />
				<span>{{ props.totalTokens.toLocaleString() }}t (${{ props.totalCost.toFixed(4) }})</span>
			</span>
			<span :class="$style.sep">·</span>
			<span :class="$style.metricItem">
				<N8nIcon icon="clock" :size="12" />
				<span>{{ props.durationLabel }}</span>
			</span>
			<N8nButton
				variant="ghost"
				icon-only
				size="medium"
				:aria-label="i18n.baseText('generic.close')"
				data-testid="agent-session-timeline-close"
				data-test-id="agent-session-timeline-close"
				@click="emit('close')"
			>
				<N8nIcon icon="x" :size="16" />
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
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
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	user-select: none;
	color: var(--text-color--subtler);
	margin-left: auto;
}

.sep {
	color: var(--text-color--subtler);
}

.metricItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
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
</style>
