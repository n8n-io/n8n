<script setup lang="ts">
import type { AgentSkillVersionInfo, SkillVersionSummary } from '@n8n/api-types';
import {
	N8nBadge,
	N8nIcon,
	N8nDropdownMenu,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref } from 'vue';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { formatSkillVersion } from './skillVersionLabels';
import { skillUserName } from './skillVersionDiff.utils';
import { draftMatchesPublished } from './skillVersionState';
import { skillVersionStyle } from './skillVersionStyle';
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
	/** Opens the diff dialog. `from` is the older version. */
	compare: [from: number, to: number];
}>();

const i18n = useI18n();
const { showError } = useToast();

const FOLLOW_LATEST = 'follow-latest';
const PIN_HEADER = 'pin-header';
const COMPARE = 'compare';

const open = ref(false);
const loading = ref(false);
const versions = ref<SkillVersionSummary[]>([]);

/**
 * The badge shows only the draft version. The caption under it says if the draft is
 * pinned. The color tells if the published agent runs other content.
 */
const kind = computed(() => (props.info.pinned ? 'pinned' : 'latest'));
const unpublished = computed(() => !draftMatchesPublished(props.info));
// The draft tag keeps one colour; the Published agent column shows how they differ.
const style = computed(() => skillVersionStyle('unpublished'));

const badgeText = computed(() =>
	i18n.baseText('agents.builder.skills.version.number', {
		interpolate: { version: String(props.info.draft) },
	}),
);

const tooltip = computed(() =>
	i18n.baseText(`agents.builder.skills.version.tooltip.${kind.value}`, {
		interpolate: { version: String(props.info.draft) },
	}),
);

/**
 * The pair "Compare versions…" opens: the draft and the latest version, or the two
 * newest versions when the draft is on the latest one.
 */
const compareRange = computed(() => {
	const { draft, latest } = props.info;
	if (draft < latest) return { from: draft, to: latest };
	const previous = versions.value.find((summary) => summary.version < latest)?.version;
	return previous === undefined ? undefined : { from: previous, to: latest };
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
	...(compareRange.value
		? [
				{
					id: COMPARE,
					label: i18n.baseText('agents.builder.skills.version.menu.compare'),
					icon: { type: 'icon', value: 'file-diff' },
					divided: true,
					testId: 'agent-skill-version-compare',
				} satisfies MenuItem,
			]
		: []),
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
	if (id === COMPARE) {
		if (compareRange.value) emit('compare', compareRange.value.from, compareRange.value.to);
		return;
	}
	if (id === FOLLOW_LATEST) {
		if (props.info.pinned) emit('follow-latest');
		return;
	}
	const summary = versions.value.find((entry) => entry.id === id);
	if (!summary) return;
	if (props.info.pinned && props.info.draft === summary.version) return;
	emit('pin', summary.id, summary.version);
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
					:variant="style.variant"
					size="small"
					trailing-icon="chevron-down"
					:disabled="props.disabled"
					:class="$style.badge"
					:data-state="kind"
					:data-unpublished="unpublished"
					data-testid="agent-skill-version-badge"
				>
					<template v-if="props.info.pinned" #leading>
						<N8nIcon icon="pin" size="xsmall" />
					</template>
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
			<N8nText v-else size="small" color="text-dark" :class="ui.class">{{ item.label }}</N8nText>
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

.loading {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--xs);
}
</style>
