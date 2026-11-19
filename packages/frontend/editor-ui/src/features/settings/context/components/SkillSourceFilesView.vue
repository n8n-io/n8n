<script lang="ts" setup>
import type { DiscoveredSkill, SkillScanFinding, SkillUpdateFile } from '@n8n/api-types';
import { computed, useCssModule, useId, useTemplateRef, type Directive } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';

import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{ skill: DiscoveredSkill; diffFiles?: SkillUpdateFile[] }>();

const i18n = useI18n();
const styles = useCssModule();
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
		return unstorable
			? `${pathInSource(path)} · ${ruleText('file_unstorable')}`
			: pathInSource(path);
	}),
);

function findingText(finding: SkillScanFinding): string {
	const text = ruleText(finding.rule);
	return finding.file
		? i18n.baseText('settings.context.skills.connect.check.findingInFile', {
				interpolate: {
					finding: text,
					file: finding.location ? `${finding.file}:${finding.location.line}` : finding.file,
				},
			})
		: text;
}

const SEVERITY_ORDER = { blocked: 0, needs_review: 1, info: 2 } as const;

/**
 * Splits one line at the marks of its findings. Where marks start at the same place, the most
 * severe one shows. A mark that overlaps an earlier one is dropped.
 */
function segmentsOf(text: string, marks: SkillScanFinding[], offset = 0): Segment[] {
	const sorted = [...marks].sort(
		(a, b) =>
			(a.location?.start ?? 0) - (b.location?.start ?? 0) ||
			SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
	);
	const segments: Segment[] = [];
	let at = 0;
	for (const finding of sorted) {
		const start = Math.max(0, Math.min((finding.location?.start ?? 0) - offset, text.length));
		const end = Math.max(0, Math.min((finding.location?.end ?? 0) - offset, text.length));
		if (start < at || end <= start) continue;
		if (start > at) segments.push({ text: text.slice(at, start) });
		segments.push({ text: text.slice(start, end), finding });
		at = end;
	}
	if (at < text.length || segments.length === 0) segments.push({ text: text.slice(at) });
	return segments;
}

function markClass(finding: SkillScanFinding): string {
	return styles[
		finding.severity === 'blocked'
			? 'blocked'
			: finding.severity === 'needs_review'
				? 'warning'
				: 'info'
	];
}

// The diff viewer has no line slot. Keep its word spans and decorate only their text nodes.
const vFindingMarks: Directive<HTMLElement, SkillScanFinding[]> = (element, { value }) => {
	for (const mark of element.querySelectorAll('[data-test-id="skill-source-finding-mark"]')) {
		const parent = mark.parentNode;
		mark.replaceWith(document.createTextNode(mark.textContent ?? ''));
		parent?.normalize();
	}
	if (!value.length) return;
	for (const row of element.querySelectorAll('tr')) {
		const line = Number(row.children[1]?.textContent);
		const marks = value.filter((finding) => finding.location?.line === line);
		const code = row.querySelector('.blob-code-inner');
		if (!marks.length || !code) continue;
		const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
		const nodes: Text[] = [];
		while (walker.nextNode()) {
			if (walker.currentNode instanceof Text) nodes.push(walker.currentNode);
		}
		let offset = 0;
		for (const node of nodes) {
			const fragment = document.createDocumentFragment();
			for (const segment of segmentsOf(node.data, marks, offset)) {
				if (segment.finding) {
					const mark = document.createElement('mark');
					mark.className = markClass(segment.finding);
					mark.title = ruleText(segment.finding.rule);
					mark.dataset.testId = 'skill-source-finding-mark';
					mark.textContent = segment.text;
					fragment.append(mark);
				} else fragment.append(document.createTextNode(segment.text));
			}
			offset += node.length;
			node.replaceWith(fragment);
		}
	}
};

const reviewFiles = computed<SkillUpdateFile[]>(
	() =>
		props.diffFiles ??
		props.skill.previewFiles.map((file) => ({
			path: file.path,
			before: file.text,
			after: file.text,
		})),
);

const files = computed(() =>
	reviewFiles.value.map((file) => {
		const marks = findings.value.filter(
			(finding) => finding.file === file.path && finding.location,
		);

		const lines: Line[] = props.diffFiles
			? []
			: file.after.split('\n').map((text, index) => ({
					number: index + 1,
					segments: segmentsOf(
						text,
						marks.filter((finding) => finding.location?.line === index + 1),
					),
				}));
		return {
			...file,
			marks,
			lines,
		};
	}),
);

const reviewFindings = computed(() =>
	findings.value.filter((finding) => finding.severity !== 'info'),
);
</script>

<template>
	<div :class="$style.pane" data-test-id="skill-source-preview">
		<div :class="$style.content" data-test-id="skill-source-file-content">
			<N8nCallout
				v-if="reviewFindings.length"
				:theme="skill.check?.verdict === 'blocked' ? 'danger' : 'warning'"
				data-test-id="skill-source-findings"
			>
				<N8nText size="small" bold>{{
					i18n.baseText('settings.context.skills.connect.review.issues', {
						interpolate: { count: reviewFindings.length },
						adjustToNumber: reviewFindings.length,
					})
				}}</N8nText>
				<ul :class="$style.findings">
					<li
						v-for="(finding, index) in reviewFindings"
						:key="index"
						data-test-id="skill-source-finding"
					>
						{{ findingText(finding) }}
					</li>
				</ul>
			</N8nCallout>
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
					<N8nText v-if="file.status" size="small">{{
						i18n.baseText(
							file.status === 'added'
								? 'settings.context.skills.updates.fileAdded'
								: 'settings.context.skills.updates.fileRemoved',
						)
					}}</N8nText>
					<N8nLink
						v-if="file.status !== 'removed'"
						:href="fileUrl(file.path)"
						new-window
						size="small"
					>
						{{ i18n.baseText('settings.context.skills.synced.openInGithub') }}
					</N8nLink>
				</header>
				<pre v-if="!diffFiles" :class="$style.text"><code><span
				v-for="line in file.lines"
				:key="line.number"
				:class="$style.line"
			><span :class="$style.number" :aria-hidden="!diffFiles">{{ line.number }}</span><span><template
				v-for="(segment, index) in line.segments"
				:key="index"
			><mark
				v-if="segment.finding"
				:class="markClass(segment.finding)"
				:title="ruleText(segment.finding.rule)"
				data-test-id="skill-source-finding-mark"
			>{{ segment.text }}</mark><template v-else>{{ segment.text }}</template></template></span></span></code></pre>
				<NodeDiff
					v-if="diffFiles"
					v-finding-marks="file.marks"
					:class="$style.diff"
					:old-string="file.before"
					:new-string="file.after"
					language="plaintext"
					:context="Math.max(file.before.split('\n').length, file.after.split('\n').length)"
					data-test-id="skill-source-file-diff"
				/>
			</section>
			<N8nText
				v-if="skill.previewTruncated"
				size="small"
				color="text-light"
				data-test-id="skill-source-preview-truncated"
			>
				{{ i18n.baseText('settings.context.skills.connect.review.truncated') }}
			</N8nText>
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
			<slot name="footer" />
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
	padding-bottom: var(--spacing--xs);
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
	overflow-wrap: anywhere;
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

/* Let the file contain the diff so content below it cannot overlap. */
.file .diff {
	height: auto;

	:global(.blob-num) {
		display: table-cell;
		color: var(--color--text--tint-1);
	}

	tr:has(.warning) {
		box-shadow: inset var(--spacing--5xs) 0 var(--text-color--warning);

		:global(.blob-num):nth-child(2) {
			box-shadow: inset var(--spacing--5xs) 0 var(--text-color--warning);
			color: var(--text-color--warning);
			font-weight: var(--font-weight--bold);
		}

		:global(.blob-code-context) {
			background-color: var(--callout--color--background--warning);
		}
	}
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

	&:has(.warning) {
		background-color: var(--callout--color--background--warning);
		box-shadow: inset var(--spacing--5xs) 0 var(--text-color--warning);

		.number {
			color: var(--text-color--warning);
			font-weight: var(--font-weight--bold);
		}
	}
}

.number {
	flex-shrink: 0;
	min-width: var(--spacing--xl);
	text-align: right;
	color: var(--color--text--tint-1);
	user-select: none;
}

.warning {
	border-bottom: var(--border-width) var(--border-style) var(--text-color--warning);
	background-color: color-mix(in srgb, var(--text-color--warning) 25%, var(--background--surface));
	color: inherit;
	font-style: normal;
	font-weight: var(--font-weight--bold);
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
