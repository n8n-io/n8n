<script lang="ts" setup>
import { computed, useId } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';
import type { InstanceAiProvenanceListItem } from '@n8n/api-types';
import { N8nBadge, N8nIconButton, N8nMenuItem, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiAvailable } from '../composables/useInstanceAiAvailability';
import { useExperienceMode } from '../experience/useExperienceMode';
import AssistantSectionHeader from './AssistantSectionHeader.vue';
import { useChatTurnEnded } from './useChatTurnEnded';
import { useMyAutomations } from './useMyAutomations';

const COLLAPSED_KEY = 'n8n:sidebar:instance-ai-automations-collapsed';

type AutomationRow = {
	workflowId: string;
	active: boolean;
	status: string;
	item: IMenuItem;
	rowLabel: string;
	chat?: { to: RouteLocationRaw; label: string };
};

const props = defineProps<{ collapsed: boolean }>();

const i18n = useI18n();
const router = useRouter();
const titleId = useId();
const isAssistantAvailable = useInstanceAiAvailable();
const { isEnabled: experienceModesOn } = useExperienceMode();

// The list endpoint needs the Assistant, so the section waits for it as well as for the flag.
const isEnabled = computed(() => isAssistantAvailable.value && experienceModesOn.value);
const { automations, refresh } = useMyAutomations(isEnabled);
// A turn can build or turn on a workflow, also when the user answers an automation card.
useChatTurnEnded(() => {
	void refresh();
});

const isCollapsed = useLocalStorage(COLLAPSED_KEY, false, { writeDefaults: false });

function toRow(automation: InstanceAiProvenanceListItem): AutomationRow {
	const status = i18n.baseText(
		automation.active ? 'instanceAi.automations.on' : 'instanceAi.automations.off',
	);
	return {
		workflowId: automation.workflowId,
		active: automation.active,
		status,
		item: {
			id: `assistant-automation-${automation.workflowId}`,
			icon: 'workflow',
			label: automation.name,
			route: { to: { name: VIEWS.WORKFLOW, params: { workflowId: automation.workflowId } } },
		},
		rowLabel: i18n.baseText('instanceAi.automations.rowLabel', {
			interpolate: { name: automation.name, status },
		}),
		chat: automation.canOpenThread
			? {
					to: { name: INSTANCE_AI_THREAD_VIEW, params: { threadId: automation.threadId } },
					label: i18n.baseText('instanceAi.automations.openChatLabel', {
						interpolate: { name: automation.name },
					}),
				}
			: undefined,
	};
}

const rows = computed(() => (automations.value ?? []).map(toRow));
</script>

<template>
	<div
		v-if="isEnabled && !props.collapsed && automations !== undefined"
		:class="$style.section"
		data-test-id="assistant-automations"
	>
		<AssistantSectionHeader
			v-model:collapsed="isCollapsed"
			:title="i18n.baseText('instanceAi.automations.title')"
			:title-id="titleId"
			:link="{
				to: { name: VIEWS.HOMEPAGE },
				label: i18n.baseText('instanceAi.automations.showAll'),
				testId: 'assistant-automations-show-all',
			}"
		/>
		<template v-if="!isCollapsed">
			<N8nText
				v-if="rows.length === 0"
				tag="p"
				size="small"
				color="text-base"
				:class="$style.empty"
				data-test-id="assistant-automations-empty"
			>
				{{ i18n.baseText('instanceAi.automations.empty') }}
			</N8nText>
			<ul v-else role="list" :aria-labelledby="titleId" :class="$style.list">
				<li
					v-for="row in rows"
					:key="row.workflowId"
					:class="[$style.row, { [$style.withChat]: row.chat }]"
					data-test-id="assistant-automation-row"
				>
					<N8nMenuItem :item="row.item" :aria-label="row.rowLabel" scroll-label-on-overflow />
					<span :class="$style.trailing">
						<N8nTooltip
							v-if="row.chat"
							placement="right"
							:content="i18n.baseText('instanceAi.provenance.openChat')"
						>
							<N8nIconButton
								variant="ghost"
								size="xsmall"
								icon="message-circle"
								:aria-label="row.chat.label"
								data-test-id="assistant-automation-open-chat"
								@click="router.push(row.chat.to)"
							/>
						</N8nTooltip>
						<!-- The row label already names the status. -->
						<N8nBadge
							:variant="row.active ? 'success' : 'outline'"
							size="xxsmall"
							aria-hidden="true"
							data-test-id="assistant-automation-status"
						>
							{{ row.status }}
						</N8nBadge>
					</span>
				</li>
			</ul>
		</template>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--3xs) var(--spacing--xs);
}

.empty {
	margin: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	position: relative;

	// The trailing items sit over the end of the row, so the label stops before them and
	// the row keeps its hover colour while the pointer is on them.
	a[role='menuitem'] {
		padding-right: var(--spacing--2xl);
	}

	&:hover a[role='menuitem'] {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.withChat a[role='menuitem'] {
	padding-right: calc(var(--spacing--2xl) + var(--spacing--lg));
}

.trailing {
	position: absolute;
	top: 0;
	right: var(--spacing--4xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	// The height of an N8nMenuItem row, so that the items are centred on the row.
	height: var(--spacing--xl);
}
</style>
