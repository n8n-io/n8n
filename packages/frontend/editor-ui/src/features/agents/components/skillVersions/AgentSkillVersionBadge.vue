<script setup lang="ts">
import type { AgentSkillVersionInfo, SkillVersionSummary } from '@n8n/api-types';
import {
	N8nBadge,
	N8nDropdownMenu,
	N8nText,
	N8nTooltip,
	type BadgeVariant,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { formatSkillVersion } from './skillVersionLabels';
import { skillUserName } from './skillVersionDiff.utils';
import { skillVersionState, type SkillVersionStateKind } from './skillVersionState';
import type { SkillVersionLoader } from './useSkillVersionLoader';

const props = withDefaults(
	defineProps<{
		skillId: string;
		info: AgentSkillVersionInfo;
		loader: SkillVersionLoader;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	/** Pins the draft ref to one version. `versionId` is the version's uuid. */
	pin: [versionId: string, version: number];
	'follow-latest': [];
	compare: [from: number, to: number];
}>();

const i18n = useI18n();
const { showError } = useToast();

const FOLLOW_LATEST = 'follow-latest';
const PIN_HEADER = 'pin-header';

const state = computed(() => skillVersionState(props.info));
const open = ref(false);
const loading = ref(false);
const versions = ref<SkillVersionSummary[]>([]);

const VARIANT: Record<SkillVersionStateKind, BadgeVariant> = {
	latest: 'success',
	notLive: 'info',
	liveBehind: 'info',
	pinned: 'warning',
};

const badgeText = computed(() => {
	const { kind, draft, live } = state.value;
	const interpolate = { version: String(draft), live: String(live ?? '') };
	if (kind === 'latest')
		return i18n.baseText('agents.builder.skills.version.badge.latest', { interpolate });
	if (kind === 'notLive')
		return i18n.baseText('agents.builder.skills.version.badge.notLive', { interpolate });
	if (kind === 'liveBehind') {
		return i18n.baseText('agents.builder.skills.version.badge.liveBehind', { interpolate });
	}
	return i18n.baseText('agents.builder.skills.version.badge.pinned', { interpolate });
});

const tooltip = computed(() => {
	const { kind, draft, live } = state.value;
	const interpolate = { version: String(draft), live: String(live ?? '') };
	if (kind === 'latest' && live !== null && live !== draft) {
		return i18n.baseText('agents.builder.skills.version.tooltip.sameContent', { interpolate });
	}
	if (kind === 'latest') return i18n.baseText('agents.builder.skills.version.tooltip.latest');
	if (kind === 'notLive') return i18n.baseText('agents.builder.skills.version.tooltip.notLive');
	if (kind === 'liveBehind') {
		return i18n.baseText('agents.builder.skills.version.tooltip.liveBehind', { interpolate });
	}
	return i18n.baseText('agents.builder.skills.version.tooltip.pinned', { interpolate });
});

type MenuItem = DropdownMenuItemProps<string, SkillVersionSummary>;

const menuItems = computed<MenuItem[]>(() => [
	{
		id: FOLLOW_LATEST,
		label: i18n.baseText('agents.builder.skills.version.menu.followLatest', {
			interpolate: { version: String(props.info.latest) },
		}),
		checked: !props.info.pinned,
	},
	{
		id: PIN_HEADER,
		label: i18n.baseText('agents.builder.skills.version.menu.pinHeader'),
		header: true,
		divided: true,
	},
	...versions.value.map((summary) => ({
		id: summary.id,
		label: formatSkillVersion(i18n, summary.version, summary.label),
		checked: props.info.pinned && props.info.draft === summary.version,
		data: summary,
	})),
]);

async function onOpenChange(next: boolean) {
	open.value = next;
	if (!next) return;
	loading.value = versions.value.length === 0;
	try {
		versions.value = await props.loader.loadVersions(props.skillId, props.info.latest);
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.skills.version.menu.loadError'));
	} finally {
		loading.value = false;
	}
}

function onSelect(id: string) {
	if (id === FOLLOW_LATEST) {
		if (props.info.pinned) emit('follow-latest');
		return;
	}
	const summary = versions.value.find((entry) => entry.id === id);
	if (!summary) return;
	if (props.info.pinned && props.info.draft === summary.version) return;
	emit('pin', summary.id, summary.version);
}

function onCompare(version: number) {
	open.value = false;
	emit('compare', props.info.draft, version);
}
</script>

<template>
	<N8nDropdownMenu
		:model-value="open"
		:items="menuItems"
		:disabled="props.disabled"
		placement="bottom-end"
		width="320px"
		max-height="360px"
		content-test-id="agent-skill-version-menu"
		@update:model-value="onOpenChange"
		@select="onSelect"
	>
		<template #trigger>
			<N8nTooltip as-child :content="tooltip" :disabled="open" placement="top">
				<N8nBadge
					clickable
					:variant="VARIANT[state.kind]"
					size="small"
					trailing-icon="chevron-down"
					:disabled="props.disabled"
					:class="$style.badge"
					:data-state="state.kind"
					data-testid="agent-skill-version-badge"
				>
					{{ badgeText }}
				</N8nBadge>
			</N8nTooltip>
		</template>

		<template #item-label="{ item, ui }">
			<span
				v-if="item.id === FOLLOW_LATEST"
				:class="[ui.class, $style.option]"
				data-testid="agent-skill-follow-latest"
			>
				<N8nText size="small" color="text-dark">{{ item.label }}</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.builder.skills.version.menu.followLatestHint') }}
				</N8nText>
			</span>
			<span
				v-else-if="item.data"
				:class="[ui.class, $style.option]"
				:data-version="item.data.version"
				data-testid="agent-skill-version-option"
			>
				<N8nText size="small" color="text-dark">
					{{ item.label }}
					<N8nText v-if="item.data.version === props.info.latest" size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.skills.version.menu.latestMarker') }}
					</N8nText>
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					<template v-if="skillUserName(item.data.createdBy)">
						{{ skillUserName(item.data.createdBy) }} ·
					</template>
					<TimeAgo :date="item.data.createdAt" />
				</N8nText>
			</span>
		</template>

		<template #item-trailing="{ item }">
			<!-- Compare lives inside the option row, so it must not also pin the version. -->
			<button
				v-if="item.data && item.data.version !== props.info.draft"
				type="button"
				:class="$style.compare"
				data-testid="agent-skill-version-compare"
				@pointerdown.stop
				@pointerup.stop
				@click.stop="onCompare(item.data.version)"
			>
				{{ i18n.baseText('agents.builder.skills.version.menu.compare') }}
			</button>
		</template>

		<template v-if="loading" #footer>
			<N8nText size="small" color="text-light" :class="$style.loading">
				{{ i18n.baseText('agents.builder.skills.version.menu.loading') }}
			</N8nText>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.badge {
	flex-shrink: 0;
	white-space: nowrap;
}

.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.compare {
	padding: 0;
	border: none;
	background: none;
	font: inherit;
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
	text-decoration: underline;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.loading {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--xs);
}
</style>
