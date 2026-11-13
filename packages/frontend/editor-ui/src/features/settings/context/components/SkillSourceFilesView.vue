<script lang="ts" setup>
// The right pane of the import review: the files of one skill as plain text, with the findings
// of the security check marked where they are. The review pane polish (CONTEXT-431) replaces it.
import type { DiscoveredSkill, SkillScanFinding } from '@n8n/api-types';
import { computed, useId, useTemplateRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';

import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{ skill: DiscoveredSkill }>();

const i18n = useI18n();
const { ruleText } = useSkillSourceReasons();

type Segment = { text: string; finding?: SkillScanFinding };
type Line = { number: number; segments: Segment[] };

const findings = computed(() => props.skill.check?.findings ?? []);
const fileSections = useTemplateRef<HTMLElement[]>('fileSections');
const fileIdPrefix = useId();

function fileId(path: string): string {
	return `${fileIdPrefix}-${encodeURIComponent(path)}`;
}

function goToFile(path: string) {
	const section = fileSections.value?.find((element) => element.id === fileId(path));
	section?.scrollIntoView({ block: 'start', inline: 'nearest' });
	section?.focus({ preventScroll: true });
}

/** The full path of a file in the source, as the user knows it from GitHub. */
function pathInSource(path: string): string {
	const folder = props.skill.location.replace(/^\/+|\/+$/g, '');
	return folder ? `${folder}/${path}` : path;
}

/** The page of a file on GitHub. The skill links to its folder (`tree`), a file uses `blob`. */
function fileUrl(path: string): string {
	const encoded = path.split('/').map(encodeURIComponent).join('/');
	return `${props.skill.webUrl.replace(/\/$/, '').replace('/tree/', '/blob/')}/${encoded}`;
}

/** The skipped files, each with why n8n leaves it out. */
const skippedFiles = computed(() =>
	props.skill.skippedFiles.map((path) => {
		const unstorable = findings.value.some(
			(finding) => finding.rule === 'file_unstorable' && finding.file === path,
		);
		const reason = ruleText(unstorable ? 'file_unstorable' : 'file_skipped');
		return `${pathInSource(path)} · ${reason}`;
	}),
);

function unplacedText(finding: SkillScanFinding): string {
	const text = ruleText(finding.rule);
	return finding.file
		? i18n.baseText('settings.context.skills.connect.check.findingInFile', {
				interpolate: { finding: text, file: finding.file },
			})
		: text;
}

const SEVERITY_ORDER = { blocked: 0, needs_review: 1, info: 2 } as const;

/**
 * Splits one line at the marks of its findings. Where marks start at the same place, the most
 * severe one shows. A mark that overlaps an earlier one is dropped.
 */
function segmentsOf(text: string, marks: SkillScanFinding[]): Segment[] {
	const sorted = [...marks].sort(
		(a, b) =>
			(a.location?.start ?? 0) - (b.location?.start ?? 0) ||
			SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
	);
	const segments: Segment[] = [];
	let at = 0;
	for (const finding of sorted) {
		const start = Math.min(finding.location?.start ?? 0, text.length);
		const end = Math.min(finding.location?.end ?? 0, text.length);
		if (start < at || end <= start) continue;
		if (start > at) segments.push({ text: text.slice(at, start) });
		segments.push({ text: text.slice(start, end), finding });
		at = end;
	}
	if (at < text.length || segments.length === 0) segments.push({ text: text.slice(at) });
	return segments;
}

const files = computed(() =>
	props.skill.previewFiles.map((file) => {
		const marks = findings.value.filter(
			(finding) => finding.file === file.path && finding.location,
		);
		const lines: Line[] = file.text.split('\n').map((text, index) => ({
			number: index + 1,
			segments: segmentsOf(
				text,
				marks.filter((finding) => finding.location?.line === index + 1),
			),
		}));
		return { path: file.path, lines };
	}),
);

/**
 * Warnings and errors that the files do not mark: a finding that marks no text, such as a size
 * limit, a finding in a part that the preview leaves out, and a finding under a mark that shows
 * first. They show above the files.
 */
const unplacedFindings = computed(() => {
	const marked = new Set(
		files.value.flatMap(({ lines }) =>
			lines.flatMap(({ segments }) => segments.flatMap(({ finding }) => finding ?? [])),
		),
	);
	return findings.value.filter((finding) => finding.severity !== 'info' && !marked.has(finding));
});
</script>

<template>
	<div :class="$style.pane" data-test-id="skill-source-preview">
		<nav
			v-if="files.length > 1"
			:class="$style.fileIndex"
			:aria-label="i18n.baseText('settings.context.skills.connect.review.files')"
			data-test-id="skill-source-file-index"
		>
			<N8nText size="small" bold>
				{{ i18n.baseText('settings.context.skills.connect.review.files') }}
			</N8nText>
			<ul :class="$style.fileList">
				<li v-for="file in files" :key="file.path">
					<N8nLink
						:href="`#${encodeURIComponent(fileId(file.path))}`"
						target="_self"
						:class="$style.fileLink"
						size="small"
						theme="text"
						:underline="false"
						@click.prevent="goToFile(file.path)"
					>
						{{ file.path }}
					</N8nLink>
				</li>
			</ul>
		</nav>
		<div :class="$style.content" data-test-id="skill-source-file-content">
			<ul v-if="unplacedFindings.length > 0" :class="$style.findings">
				<li v-for="(finding, index) in unplacedFindings" :key="index">
					<N8nText
						size="small"
						:color="finding.severity === 'blocked' ? 'danger' : 'warning'"
						data-test-id="skill-source-unplaced-finding"
						>{{ unplacedText(finding) }}</N8nText
					>
				</li>
			</ul>
			<section v-if="skippedFiles.length > 0" :class="$style.skipped">
				<N8nText size="small" bold>
					{{ i18n.baseText('settings.context.skills.connect.review.skippedFiles') }}
				</N8nText>
				<ul>
					<li
						v-for="line in skippedFiles"
						:key="line"
						:class="$style.skippedFile"
						data-test-id="skill-source-skipped-file"
					>
						{{ line }}
					</li>
				</ul>
			</section>
			<section
				v-for="file in files"
				:id="fileId(file.path)"
				:key="file.path"
				ref="fileSections"
				:class="$style.file"
				:aria-label="pathInSource(file.path)"
				tabindex="-1"
				data-test-id="skill-source-file"
			>
				<header :class="$style.fileHeader">
					<N8nIcon icon="file-text" size="small" color="text-light" />
					<N8nText size="small" :class="$style.path" data-test-id="skill-source-file-path">{{
						pathInSource(file.path)
					}}</N8nText>
					<N8nLink :href="fileUrl(file.path)" new-window size="small">
						{{ i18n.baseText('settings.context.skills.synced.openInGithub') }}
					</N8nLink>
				</header>
				<pre :class="$style.text"><code><span
				v-for="line in file.lines"
				:key="line.number"
				:class="$style.line"
			><span :class="$style.number" aria-hidden="true">{{ line.number }}</span><span><template
				v-for="(segment, index) in line.segments"
				:key="index"
			><mark
				v-if="segment.finding"
				:class="segment.finding.severity === 'blocked' ? $style.blocked : segment.finding.severity === 'needs_review' ? $style.warning : $style.info"
				:title="ruleText(segment.finding.rule)"
				data-test-id="skill-source-finding-mark"
			>{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></span></span></code></pre>
			</section>
			<N8nText
				v-if="skill.previewTruncated"
				size="small"
				color="text-light"
				data-test-id="skill-source-preview-truncated"
			>
				{{ i18n.baseText('settings.context.skills.connect.review.truncated') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.pane {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.fileIndex {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	max-height: 30%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.fileList {
	min-height: 0;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
}

.fileLink {
	display: block;
	padding: var(--spacing--3xs);
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	overflow-wrap: anywhere;

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
	}
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.findings,
.skipped ul {
	margin: 0;
	padding-left: var(--spacing--sm);
}

.skipped {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.skippedFile {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.file {
	flex-shrink: 0;
	border: var(--border);
	border-radius: var(--radius);
}

.fileHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.path {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
	font-family: var(--font-family--monospace);
}

.text {
	margin: 0;
	padding: var(--spacing--2xs) 0;
	overflow-x: auto;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.line {
	display: flex;
	gap: var(--spacing--xs);
	padding-right: var(--spacing--xs);
}

.number {
	flex-shrink: 0;
	min-width: var(--spacing--xl);
	text-align: right;
	color: var(--color--text--tint-2);
	user-select: none;
}

.warning {
	background-color: var(--callout--color--background--warning);
	color: inherit;
}

.blocked {
	background-color: var(--callout--color--background--danger);
	color: inherit;
}

.info {
	background-color: var(--color--background--light-1);
	color: inherit;
}
</style>
