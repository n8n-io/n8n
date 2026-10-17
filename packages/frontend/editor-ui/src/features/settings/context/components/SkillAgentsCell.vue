<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { SkillListItem, SkillUsage } from '@n8n/api-types';
import { N8nBadge, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { BadgeVariant, DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import {
	skillVersionStyle,
	type SkillVersionStyleKind,
} from '@/features/agents/components/skillVersions/skillVersionStyle';

import { useSkillsStore } from '../skills.store';

const HIDDEN_AGENTS_ITEM = 'hidden-agents';
const TITLE_ITEM = 'title';

/** The version an agent uses, as a badge next to its name. */
type VersionBadge = {
	label: string;
	variant: BadgeVariant;
	icon?: IconName;
	tooltip?: string;
};

type AgentUsage = {
	agentName: string;
	projectId: string;
	draft?: SkillUsage['drafts'][number];
	pin?: SkillUsage['pins'][number];
};

const props = defineProps<{
	skill: Pick<SkillListItem, 'id' | 'usedByAgents'>;
}>();

const i18n = useI18n();
const router = useRouter();
const skillsStore = useSkillsStore();
const { showError } = useToast();

const usage = ref<SkillUsage | null>(null);
const loading = ref(false);

/** A draft and a published version of the same agent count once, as `usedByAgents` does. */
const agents = computed(() => {
	const byId = new Map<string, AgentUsage>();
	const entry = (agent: { agentId: string; agentName: string; projectId: string }) => {
		const existing = byId.get(agent.agentId);
		if (existing) return existing;
		const created: AgentUsage = { agentName: agent.agentName, projectId: agent.projectId };
		byId.set(agent.agentId, created);
		return created;
	};
	for (const draft of usage.value?.drafts ?? []) entry(draft).draft = draft;
	for (const pin of usage.value?.pins ?? []) entry(pin).pin ??= pin;
	return byId;
});

function versionText(key: 'latest' | 'pinned' | 'live', version: number) {
	return i18n.baseText(`settings.context.skills.versions.agents.${key}`, {
		interpolate: { version: String(version) },
	});
}

function badge(kind: SkillVersionStyleKind, label: string, tooltip?: string): VersionBadge {
	return { label, ...skillVersionStyle(kind), tooltip };
}

/**
 * The draft decides the label: pinned, or following the latest. The color tells if the
 * published agent runs that version, as in the builder and in workflow history.
 */
function versionBadge({ draft, pin }: AgentUsage): VersionBadge {
	const live = pin?.version ?? null;
	if (draft?.pinned) return badge('pinned', versionText('pinned', draft.version));
	if (draft) {
		const label = versionText('latest', draft.version);
		if (live === null) {
			return badge(
				'unpublished',
				label,
				i18n.baseText('settings.context.skills.versions.agents.notPublished'),
			);
		}
		if (live === draft.version) return badge('published', label);
		// A restore saves old content as a new version, so the published agent is up to date.
		if (draft.liveHasSameContent) {
			return badge(
				'published',
				label,
				i18n.baseText('settings.context.skills.versions.agents.sameContent', {
					interpolate: { live: String(live) },
				}),
			);
		}
		return badge(
			'unpublished',
			label,
			i18n.baseText('settings.context.skills.versions.agents.liveRuns', {
				interpolate: { live: String(live) },
			}),
		);
	}
	if (live !== null) return badge('published', versionText('live', live));
	return {
		label: i18n.baseText('settings.context.skills.versions.agents.olderPublished'),
		variant: 'subtle',
	};
}

const items = computed<Array<DropdownMenuItemProps<string, VersionBadge>>>(() => {
	const list: Array<DropdownMenuItemProps<string, VersionBadge>> = [];
	if (agents.value.size > 0) {
		list.push({
			id: TITLE_ITEM,
			label: i18n.baseText('settings.context.skills.versions.agents.title'),
			header: true,
		});
	}
	for (const [id, agent] of agents.value) {
		list.push({
			id,
			label: agent.agentName,
			icon: { type: 'icon', value: 'bot' },
			data: versionBadge(agent),
			testId: 'skill-agents-item',
		});
	}
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

async function onSelect(agentId: string) {
	const agent = agents.value.get(agentId);
	if (!agent) return;
	await router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: agent.projectId, agentId },
	});
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
					v-if="item.data"
					:content="item.data.tooltip"
					:disabled="!item.data.tooltip"
					placement="top"
				>
					<N8nBadge
						:variant="item.data.variant"
						:leading-icon="item.data.icon"
						size="xsmall"
						:class="$style.badge"
						data-test-id="skill-agents-version"
					>
						{{ item.data.label }}
					</N8nBadge>
				</N8nTooltip>
			</template>
			<template #trigger>
				<button
					type="button"
					:class="$style.trigger"
					:aria-label="
						i18n.baseText('settings.context.skills.versions.agents.trigger', {
							interpolate: { count: props.skill.usedByAgents },
							adjustToNumber: props.skill.usedByAgents,
						})
					"
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
.badge {
	margin-left: var(--spacing--xs);
	white-space: nowrap;
}

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
