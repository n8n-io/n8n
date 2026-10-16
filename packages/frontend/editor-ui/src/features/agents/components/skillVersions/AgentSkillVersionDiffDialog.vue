<script setup lang="ts">
import type {
	AgentSkillVersionInfo,
	SkillVersionDetail,
	SkillVersionSummary,
} from '@n8n/api-types';
import { N8nButton, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref, watch } from 'vue';

import AgentModal from '../modals/AgentModal.vue';
import SkillVersionDiff from './SkillVersionDiff.vue';
import { formatSkillVersion } from './skillVersionLabels';
import { getSkillDiffSections } from './skillVersionDiff.utils';
import { isPinnedBehindLatest, type SkillVersionRange } from './skillVersionState';
import type { SkillVersionLoader } from './useSkillVersionLoader';

const props = defineProps<{
	open: boolean;
	skillId: string;
	skillName: string;
	info: AgentSkillVersionInfo;
	/** The pair the dialog opens on. The user can change both sides. */
	range: SkillVersionRange;
	loader: SkillVersionLoader;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	'open-skill': [];
	'follow-latest': [];
}>();

const i18n = useI18n();
const { showError } = useToast();

const versions = ref<SkillVersionSummary[]>([]);
const from = ref(props.range.from);
const to = ref(props.range.to);
const fromDetail = ref<SkillVersionDetail | null>(null);
const toDetail = ref<SkillVersionDetail | null>(null);

const canFollowLatest = computed(() => isPinnedBehindLatest(props.info));

function versionTags(version: number): string[] {
	const tags: string[] = [];
	if (version === props.info.live) {
		tags.push(i18n.baseText('agents.builder.skills.version.diff.tag.live'));
	}
	if (version === props.info.draft) {
		tags.push(i18n.baseText('agents.builder.skills.version.diff.tag.draft'));
	}
	if (version === props.info.latest) {
		tags.push(i18n.baseText('agents.builder.skills.version.diff.tag.latest'));
	}
	return tags;
}

function optionLabel(summary: Pick<SkillVersionSummary, 'version' | 'label'>): string {
	const label = formatSkillVersion(i18n, summary.version, summary.label);
	const tags = versionTags(summary.version);
	if (tags.length === 0) return label;
	return i18n.baseText('agents.builder.skills.version.diff.taggedOption', {
		interpolate: { version: label, tags: tags.join(', ') },
	});
}

function versionLabel(version: number): string {
	const summary = versions.value.find((entry) => entry.version === version);
	return formatSkillVersion(i18n, version, summary?.label);
}

const title = computed(() =>
	i18n.baseText('agents.builder.skills.version.diff.title', {
		interpolate: {
			name: props.skillName,
			from: versionLabel(from.value),
			to: versionLabel(to.value),
		},
	}),
);

async function loadVersions() {
	try {
		versions.value = await props.loader.loadVersions(props.skillId, props.info.latest);
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.skills.version.menu.loadError'));
	}
}

async function loadDetail(side: 'from' | 'to', version: number) {
	const selected = side === 'from' ? from : to;
	const detail = side === 'from' ? fromDetail : toDetail;
	try {
		const loaded = await props.loader.loadVersion(props.skillId, version);
		// A newer pick may have replaced this one while it loaded.
		if (selected.value === version) detail.value = loaded;
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.skills.version.diff.loadError'));
	}
}

watch(
	() => [props.open, props.range.from, props.range.to] as const,
	([open]) => {
		if (!open) return;
		from.value = props.range.from;
		to.value = props.range.to;
		void loadVersions();
	},
	{ immediate: true },
);

watch(
	() => [props.open, from.value, to.value] as const,
	([open, fromVersion, toVersion]) => {
		if (!open) return;
		void loadDetail('from', fromVersion);
		void loadDetail('to', toVersion);
	},
	{ immediate: true },
);

const ready = computed(
	() => fromDetail.value?.version === from.value && toDetail.value?.version === to.value,
);

/** True when both loaded sides have the same content, as a restore saves. */
const sameContent = computed(
	() =>
		ready.value &&
		!!fromDetail.value &&
		!!toDetail.value &&
		getSkillDiffSections(fromDetail.value.skill, toDetail.value.skill).every(
			(section) => !section.changed,
		),
);

const note = computed(() => {
	const { draft, live } = props.info;
	if (canFollowLatest.value) {
		return i18n.baseText('agents.builder.skills.version.diff.note.pinned', {
			interpolate: { version: String(draft) },
		});
	}
	if (live !== null && live !== draft) {
		if (props.info.liveHasSameContent || sameContent.value) {
			return i18n.baseText('agents.builder.skills.version.diff.note.sameContent');
		}
		return i18n.baseText('agents.builder.skills.version.diff.note.liveBehind', {
			interpolate: { version: String(draft), live: String(live) },
		});
	}
	return '';
});
</script>

<template>
	<AgentModal
		:open="props.open"
		:title="title"
		:show-cancel="false"
		size="2xlarge"
		@update:open="emit('update:open', $event)"
	>
		<div :class="$style.content" data-testid="agent-skill-version-diff-dialog">
			<div :class="$style.bar">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.skills.version.diff.compare') }}
				</N8nText>
				<N8nSelect
					v-model="from"
					size="small"
					:class="$style.select"
					:aria-label="i18n.baseText('agents.builder.skills.version.diff.from')"
					data-testid="agent-skill-version-diff-from"
				>
					<N8nOption
						v-for="summary in versions"
						:key="summary.id"
						:value="summary.version"
						:label="optionLabel(summary)"
					/>
				</N8nSelect>
				<N8nText size="small" color="text-light" aria-hidden="true">→</N8nText>
				<N8nSelect
					v-model="to"
					size="small"
					:class="$style.select"
					:aria-label="i18n.baseText('agents.builder.skills.version.diff.to')"
					data-testid="agent-skill-version-diff-to"
				>
					<N8nOption
						v-for="summary in versions"
						:key="summary.id"
						:value="summary.version"
						:label="optionLabel(summary)"
					/>
				</N8nSelect>
			</div>

			<SkillVersionDiff
				v-if="ready && fromDetail && toDetail"
				:from="fromDetail.skill"
				:to="toDetail.skill"
				:from-label="optionLabel(fromDetail)"
				:to-label="optionLabel(toDetail)"
			/>
			<N8nText v-else size="small" color="text-light">
				{{ i18n.baseText('agents.builder.skills.version.menu.loading') }}
			</N8nText>
		</div>

		<template #footerLeft>
			<N8nText size="small" color="text-light" data-testid="agent-skill-version-diff-note">
				{{ note }}
			</N8nText>
		</template>
		<template #footerActions>
			<N8nButton
				variant="outline"
				data-testid="agent-skill-version-diff-open-skill"
				@click="emit('open-skill')"
			>
				{{ i18n.baseText('agents.builder.skills.version.diff.openSkill') }}
			</N8nButton>
			<N8nButton
				v-if="canFollowLatest"
				variant="solid"
				data-testid="agent-skill-follow-latest"
				@click="emit('follow-latest')"
			>
				{{ i18n.baseText('agents.builder.skills.version.followLatest') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.bar {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.select {
	width: calc(var(--spacing--5xl) + var(--spacing--xl));
}
</style>
