<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AgentSkill, SkillScanFinding } from '@n8n/api-types';
import { N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import SkillDiffCount from '@/features/agents/components/skillVersions/SkillDiffCount.vue';
import SkillVersionDiff from '@/features/agents/components/skillVersions/SkillVersionDiff.vue';
import {
	SKILL_FILE,
	countsByFile,
	type DiffSection,
} from '@/features/agents/components/skillVersions/skillVersionDiff';

import SkillDiffViewer from './SkillDiffViewer.vue';

/** The key of the frontmatter section in a diff. It is not a file, so it has its own label. */
const FRONTMATTER = 'frontmatter';

const props = defineProps<{
	/** The skill to show. Not used when `sections` is set. */
	skill?: AgentSkill | null;
	/** The diff of `compareFrom` and `skill`. It gives the files, their counts and the frontmatter. */
	sections?: DiffSection[];
	/** The older version. With it, each file shows `skill` with the changes overlaid. */
	compareFrom?: AgentSkill | null;
	/** The folder of the skill in its source, put before each file path. */
	location?: string;
	/** Check findings. Each one shows at the top of the file that it is in. */
	findings?: SkillScanFinding[];
	/** The folder of the skill on the web, such as on GitHub. Each file links to its page there. */
	webUrl?: string;
	/** Files that n8n leaves out of the skill, after the files it keeps. They start folded. */
	skippedFiles?: Array<{ path: string; detail: string }>;
}>();

const i18n = useI18n();

const counts = computed(() => (props.sections ? countsByFile(props.sections) : {}));

/** SKILL.md first, then the references. A diff also lists the files that the change removes. */
const files = computed(() => {
	if (props.sections) return Object.keys(counts.value);
	return [SKILL_FILE, ...(props.skill?.references ?? []).map((reference) => reference.path)];
});

/** The page of a file in the source. A folder link uses `tree`, a file link `blob`. */
function linkTo(path: string): string {
	const folder = (props.webUrl ?? '').replace(/\/$/, '').replace('/tree/', '/blob/');
	return `${folder}/${path}`;
}

/** Only a file that the shown version has links out. A file that a diff removes is gone. */
function fileUrl(path: string): string | undefined {
	if (!props.webUrl || path === FRONTMATTER) return undefined;
	const exists =
		path === SKILL_FILE ||
		(props.skill?.references ?? []).some((reference) => reference.path === path);
	return exists ? linkTo(path) : undefined;
}

function findingsIn(path: string): SkillScanFinding[] {
	return (props.findings ?? []).filter((finding) => finding.file === path);
}

/** A warning or an error. A finding for information does not count. */
function isIssue(finding: SkillScanFinding): boolean {
	return finding.severity !== 'info';
}

function hasIssues(path: string): boolean {
	return findingsIn(path).some(isIssue);
}

/**
 * The files that the user unfolded. A folded file shows only its warnings and errors, so
 * every file starts folded and a file with no issue shows only its header.
 */
const expanded = ref(new Set<string>());
/** The left-out files that the user unfolded. */
const openSkipped = ref(new Set<string>());

// Another skill opens with every file folded.
watch(
	() => [props.skill, props.sections, props.skippedFiles],
	() => {
		expanded.value = new Set();
		openSkipped.value = new Set();
	},
);

function flip(set: Set<string>, path: string): Set<string> {
	const next = new Set(set);
	if (next.has(path)) next.delete(path);
	else next.add(path);
	return next;
}

function toggle(path: string) {
	expanded.value = flip(expanded.value, path);
}

function toggleSkipped(path: string) {
	openSkipped.value = flip(openSkipped.value, path);
}

function label(path: string): string {
	if (path === FRONTMATTER) return i18n.baseText('settings.context.skills.review.frontmatter');
	return props.location ? `${props.location.replace(/\/$/, '')}/${path}` : path;
}
</script>

<template>
	<div :class="$style.files" data-test-id="skill-files-view">
		<section
			v-for="path in files"
			:key="path"
			:class="$style.file"
			data-test-id="skill-files-view-file"
		>
			<div :class="$style.header">
				<button
					type="button"
					:class="$style.toggle"
					:aria-expanded="expanded.has(path)"
					data-test-id="skill-files-view-toggle"
					@click="toggle(path)"
				>
					<N8nIcon
						:icon="expanded.has(path) ? 'chevron-down' : 'chevron-right'"
						size="small"
						color="text-light"
					/>
					<N8nIcon icon="file-text" size="small" color="text-light" />
					<N8nText size="small" color="text-light" :class="$style.path">{{ label(path) }}</N8nText>
					<SkillDiffCount v-if="sections" :count="counts[path]" hide-zero />
				</button>
				<N8nIconButton
					v-if="fileUrl(path)"
					icon="external-link"
					variant="ghost"
					size="xsmall"
					:href="fileUrl(path)"
					target="_blank"
					:aria-label="i18n.baseText('settings.context.skills.synced.openInGithub')"
					:title="i18n.baseText('settings.context.skills.synced.openInGithub')"
					data-test-id="skill-files-view-open"
				/>
			</div>
			<!-- Folded, a file shows only its warnings and errors. Unfolded, the whole file. -->
			<div v-if="expanded.has(path) || hasIssues(path)" :class="$style.body">
				<!-- The skill modal layout. With an older version, the changes show as a diff. -->
				<SkillDiffViewer
					v-if="skill && path !== FRONTMATTER"
					:from="compareFrom"
					:to="skill"
					:selected-path="path"
					:findings="findingsIn(path)"
					:focus="!expanded.has(path)"
				/>
				<SkillVersionDiff
					v-else-if="sections && expanded.has(path)"
					:sections="sections"
					:selected-path="path"
				/>
			</div>
		</section>
		<section
			v-for="file in skippedFiles ?? []"
			:key="`skipped:${file.path}`"
			:class="[$style.file, $style.skipped]"
			data-test-id="skill-files-view-skipped"
		>
			<div :class="$style.header">
				<button
					type="button"
					:class="$style.toggle"
					:aria-expanded="openSkipped.has(file.path)"
					@click="toggleSkipped(file.path)"
				>
					<N8nIcon
						:icon="openSkipped.has(file.path) ? 'chevron-down' : 'chevron-right'"
						size="small"
						color="text-light"
					/>
					<N8nIcon icon="file-minus" size="small" color="text-light" />
					<N8nText size="small" color="text-light" :class="$style.path">{{
						label(file.path)
					}}</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.context.skills.files.leftOut') }}
					</N8nText>
				</button>
				<N8nIconButton
					v-if="webUrl"
					icon="external-link"
					variant="ghost"
					size="xsmall"
					:href="linkTo(file.path)"
					target="_blank"
					:aria-label="i18n.baseText('settings.context.skills.synced.openInGithub')"
					:title="i18n.baseText('settings.context.skills.synced.openInGithub')"
				/>
			</div>
			<div v-if="openSkipped.has(file.path)" :class="$style.body">
				<N8nText size="small" color="text-base">{{ file.detail }}</N8nText>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.files {
	display: flex;
	flex-direction: column;
}

.file {
	display: flex;
	flex-direction: column;
	border-top: var(--border);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.toggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--xs) 0;
	border: 0;
	background: transparent;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

.path {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	padding-bottom: var(--spacing--sm);
}

/* A left-out file is not part of the skill, so its path reads struck through. */
.skipped .path {
	text-decoration: line-through;
}
</style>
