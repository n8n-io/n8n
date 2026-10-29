<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SkillListItem, SkillUsedBy } from '@n8n/api-types';
import { N8nBadge, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
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

/** The version an agent draft runs, as the design shows it. */
type VersionBadge = {
	label: string;
	variant: 'success' | 'warning' | 'outline';
	/** Only a pinned version has an icon. */
	pinned: boolean;
	/** Set when the published agent runs another version than the draft. */
	tooltip?: string;
};

type AgentRow = { agentName: string; projectId: string; badge?: VersionBadge };

function versionBadge(
	draft: SkillUsedBy['drafts'][number],
	published: number | null | undefined,
): VersionBadge {
	if (draft.pinned) {
		return {
			label: i18n.baseText('settings.context.skills.versions.agents.pinned', {
				interpolate: { version: draft.version },
			}),
			variant: 'outline',
			pinned: true,
		};
	}
	const label = i18n.baseText('settings.context.skills.versions.agents.latest', {
		interpolate: { version: draft.version },
	});
	// Amber: the draft follows the latest version, but the published agent still runs an older one.
	if (published !== null && published !== undefined && published !== draft.version) {
		return {
			label,
			variant: 'warning',
			pinned: false,
			tooltip: i18n.baseText('settings.context.skills.versions.agents.publishedUses', {
				interpolate: { version: published },
			}),
		};
	}
	return { label, variant: 'success', pinned: false };
}

/** A draft and a published version of the same agent count once, as `usedByAgents` does. */
const agents = computed(() => {
	const published = new Map((usage.value?.pins ?? []).map((pin) => [pin.agentId, pin.version]));
	const byId = new Map<string, AgentRow>();
	for (const draft of usage.value?.drafts ?? []) {
		byId.set(draft.agentId, {
			agentName: draft.agentName,
			projectId: draft.projectId,
			badge: versionBadge(draft, published.get(draft.agentId)),
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
				<N8nTooltip
					v-if="item.data?.badge"
					:content="item.data.badge.tooltip"
					:disabled="!item.data.badge.tooltip"
					placement="top"
				>
					<N8nBadge
						:variant="item.data.badge.variant"
						:leading-icon="item.data.badge.pinned ? 'pin' : undefined"
						size="xsmall"
						:data-variant="item.data.badge.variant"
						data-test-id="skill-agents-version"
					>
						{{ item.data.badge.label }}
					</N8nBadge>
				</N8nTooltip>
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
