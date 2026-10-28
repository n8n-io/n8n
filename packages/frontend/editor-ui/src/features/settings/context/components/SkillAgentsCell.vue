<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SkillListItem, SkillUsedBy } from '@n8n/api-types';
import { N8nDropdownMenu, N8nIcon, N8nText } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';

import { useSkillsStore } from '../skills.store';

const HIDDEN_AGENTS_ITEM = 'hidden-agents';
const USED_BY_HEADER = 'used-by';

const props = defineProps<{
	skill: Pick<SkillListItem, 'id' | 'usedByAgents'>;
}>();

const i18n = useI18n();
const router = useRouter();
const skillsStore = useSkillsStore();
const { showError } = useToast();

const usage = ref<SkillUsedBy | null>(null);
const loading = ref(false);

type AgentRow = { agentName: string; projectId: string; caption?: string };

/**
 * A draft and a published version of the same agent count once, as `usedByAgents` does.
 * The caption is the version the draft runs.
 */
const agents = computed(() => {
	const byId = new Map<string, AgentRow>();
	for (const draft of usage.value?.drafts ?? []) {
		byId.set(draft.agentId, {
			agentName: draft.agentName,
			projectId: draft.projectId,
			caption: i18n.baseText(
				draft.pinned
					? 'settings.context.skills.versions.agents.pinned'
					: 'settings.context.skills.versions.agents.latest',
				{ interpolate: { version: draft.version } },
			),
		});
	}
	for (const pin of usage.value?.pins ?? []) {
		if (!byId.has(pin.agentId)) byId.set(pin.agentId, pin);
	}
	return byId;
});

const items = computed<Array<DropdownMenuItemProps<string, AgentRow>>>(() => {
	const list: Array<DropdownMenuItemProps<string, AgentRow>> = [
		{
			id: USED_BY_HEADER,
			label: i18n.baseText('settings.context.skills.versions.agents.title'),
			header: true,
		},
		...[...agents.value].map(
			([id, agent]): DropdownMenuItemProps<string, AgentRow> => ({
				id,
				label: agent.agentName,
				icon: { type: 'icon', value: 'bot' },
				data: agent,
			}),
		),
	];
	const hidden = usage.value?.hiddenAgents ?? 0;
	if (hidden > 0) {
		list.push({
			id: HIDDEN_AGENTS_ITEM,
			label: i18n.baseText('settings.context.skills.agents.hidden', {
				interpolate: { count: hidden },
				adjustToNumber: hidden,
			}),
			disabled: true,
		});
	}
	return list;
});

/** The list row has the count only, so the names load when the menu first opens. */
async function onOpenChange(open: boolean) {
	if (!open || usage.value || loading.value) return;
	loading.value = true;
	try {
		usage.value = (await skillsStore.fetchSkill(props.skill.id)).usedBy;
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.agents'));
	} finally {
		loading.value = false;
	}
}

/** Opens the agent in a new tab, so the skills list keeps its search and page. */
function onSelect(agentId: string) {
	const agent = agents.value.get(agentId);
	if (!agent) return;
	const { href } = router.resolve({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: agent.projectId, agentId },
	});
	window.open(href, '_blank', 'noopener');
}
</script>

<template>
	<N8nText
		v-if="props.skill.usedByAgents === 0"
		size="small"
		color="text-light"
		data-test-id="skill-agents-none"
	>
		—
	</N8nText>
	<!-- The row opens the skill on click, so the menu keeps its clicks to itself. -->
	<span v-else @click.stop>
		<N8nDropdownMenu
			:items="items"
			:loading="loading"
			:loading-item-count="Math.min(props.skill.usedByAgents, 3)"
			:modal="false"
			placement="bottom-start"
			content-test-id="skill-agents-menu"
			@update:model-value="onOpenChange"
			@select="onSelect"
		>
			<template #item-trailing="{ item }">
				<N8nText
					v-if="item.data?.caption"
					size="small"
					color="text-light"
					data-test-id="skill-agents-version"
				>
					{{ item.data.caption }}
				</N8nText>
			</template>
			<template #trigger>
				<button
					type="button"
					:class="$style.trigger"
					:aria-label="i18n.baseText('settings.context.skills.agents.label')"
					data-test-id="skill-agents-trigger"
				>
					<N8nText size="small" color="text-base">{{ props.skill.usedByAgents }}</N8nText>
					<N8nIcon icon="chevron-down" size="small" color="text-light" />
				</button>
			</template>
		</N8nDropdownMenu>
	</span>
</template>

<style lang="scss" module>
.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&[aria-expanded='true'] {
		background-color: var(--background--active);
	}
}
</style>
