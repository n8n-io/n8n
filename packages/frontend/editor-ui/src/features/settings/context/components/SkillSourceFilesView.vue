<script lang="ts" setup>
import type {
	DiscoveredSkill,
	SkillScanFinding,
	SkillScanLimitField,
	SkillUpdateFile,
} from '@n8n/api-types';
import {
	computed,
	nextTick,
	ref,
	useCssModule,
	useId,
	useTemplateRef,
	watch,
	type Directive,
} from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import {
	N8nAnimatedCollapsibleContent,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { diffText } from '@n8n/utils/diff-text';
import SkillDiffCount from '@/features/agents/components/skillVersions/SkillDiffCount.vue';
import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';

import {
	SKIPPED_FILE_RULES,
	useSkillSourceReasons,
} from '@/features/settings/context/skills.utils';

const props = defineProps<{ skill: DiscoveredSkill; diffFiles?: SkillUpdateFile[] }>();

const i18n = useI18n();
const styles = useCssModule();
const { ruleText } = useSkillSourceReasons();
const statusLabels: Record<NonNullable<SkillUpdateFile['status']>, BaseTextKey> = {
	added: 'settings.context.skills.updates.fileAdded',
	removed: 'settings.context.skills.updates.fileRemoved',
	modified: 'agents.builder.skills.versions.fileModified',
};

type Segment = { text: string; finding?: SkillScanFinding };
type Line = { number: number; segments: Segment[] };

/** The unchanged lines that a diff shows around each change. The viewer folds the rest. */
const DIFF_CONTEXT = 3;
/** The cell that opens a folded part of a diff. The diff viewer has no API to open one. */
const DIFF_FOLD = 'td.blob-num-hunk[colspan]';

const findings = computed(() => props.skill.check?.findings ?? []);
const fileSections = useTemplateRef<HTMLElement[]>('fileSections');
const fileIdPrefix = useId();

/** The paths of the open files. Each file starts closed. */
const openFiles = ref<string[]>([]);
watch(
	() => props.skill.key,
	() => {
		openFiles.value = [];
	},
);

function setFileOpen(path: string, open: boolean) {
	openFiles.value = open
		? [...new Set([...openFiles.value, path])]
		: openFiles.value.filter((openPath) => openPath !== path);
}

function fileId(path: string): string {
	return `${fileIdPrefix}-${encodeURIComponent(path)}`;
}

/** The number of a diff row in the new file. A removed line and a folded part have none. */
function diffLineOf(row: Element): number {
	return Number(row.children[1]?.textContent) || 0;
}

function rowOf(section: HTMLElement, line: number): Element | undefined {
	return (
		section.querySelector(`[data-line="${line}"]`) ??
		Array.from(section.querySelectorAll('tr')).find((row) => diffLineOf(row) === line)
	);
}

/** The folded parts of a diff: the cell that opens each one, and the lines of the new file that it hides. */
function foldsOf(root: HTMLElement, lineCount = Infinity) {
	const rows = Array.from(root.querySelectorAll('tr'));
	let before = 0;
	return rows.flatMap((row, index) => {
		const cell = row.querySelector<HTMLElement>(DIFF_FOLD);
		if (!cell) {
			before = diffLineOf(row) || before;
			return [];
		}
		const after = rows
			.slice(index + 1)
			.map(diffLineOf)
			.find((number) => number > 0);
		return [{ cell, row, first: before + 1, last: (after ?? lineCount + 1) - 1 }];
	});
}

/** Opens the folded part of a diff that holds a line. Returns false when no fold holds it. */
function unfoldLine(section: HTMLElement, line: number): boolean {
	const fold = foldsOf(section).find(({ first, last }) => line >= first && line <= last);
	fold?.cell.click();
	return !!fold;
}

/** The open animation moves the content of a file, so a scroll waits for its end. */
async function settled(section: HTMLElement) {
	const animations = section.getAnimations?.({ subtree: true }) ?? [];
	await Promise.allSettled(animations.map(async (animation) => await animation.finished));
}

async function goToFile(path: string, line?: number) {
	setFileOpen(path, true);
	await nextTick();
	const section = fileSections.value?.find((element) => element.id === fileId(path));
	if (!section) return;
	await settled(section);
	let row = line ? rowOf(section, line) : undefined;
	if (line && !row && unfoldLine(section, line)) {
		await nextTick();
		const file = files.value.find((candidate) => candidate.path === path);
		const diff = section.querySelector<HTMLElement>('[data-test-id="skill-source-file-diff"]');
		if (file && diff) decorateDiff(diff, file);
		row = rowOf(section, line);
	}
	(row ?? section).scrollIntoView({ block: row ? 'center' : 'start', inline: 'nearest' });
	section.focus({ preventScroll: true });
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
		const finding = findings.value.find(
			({ file, rule }) => file === path && SKIPPED_FILE_RULES.has(rule),
		);
		// A plain skipped file needs no reason. The other rules say why n8n leaves the file out.
		const rule = finding?.rule ?? 'file_skipped';
		return {
			path,
			label:
				rule === 'file_skipped' ? pathInSource(path) : `${pathInSource(path)} · ${ruleText(rule)}`,
		};
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
function markFindings(element: HTMLElement, value: SkillScanFinding[]) {
	for (const mark of element.querySelectorAll('[data-test-id="skill-source-finding-mark"]')) {
		const parent = mark.parentNode;
		mark.replaceWith(document.createTextNode(mark.textContent ?? ''));
		parent?.normalize();
	}
	if (!value.length) return;
	for (const row of element.querySelectorAll('tr')) {
		const line = diffLineOf(row);
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
}

type DiffFile = { marks: SkillScanFinding[]; after: string };

/** The diff viewer has no slots, so this adds the marks of the findings and the labels of the folded parts. */
function decorateDiff(diff: HTMLElement, file: DiffFile) {
	markFindings(diff, file.marks);
	// The viewer leaves out a line break at the end of the file.
	const lineCount = file.after.replace(/\n$/, '').split('\n').length;
	for (const { row, first, last } of foldsOf(diff, lineCount)) {
		const count = last - first + 1;
		const label = i18n.baseText('settings.context.skills.connect.review.unchangedLines', {
			interpolate: { count },
			adjustToNumber: count,
		});
		// The last cell shows the label. It is the button for the keyboard.
		const attributes = { 'data-label': label, 'aria-label': label, role: 'button', tabindex: '0' };
		for (const [name, value] of Object.entries(attributes)) {
			row.lastElementChild?.setAttribute(name, value);
		}
	}
}

const vDiffDecor: Directive<HTMLElement, DiffFile> = (element, { value }) =>
	decorateDiff(element, value);

/**
 * Opens a folded part from a click or a key on its row. Only the first cell of the viewer listens
 * for a click. The viewer shows the lines without an update of this component, so the new rows
 * get their marks and labels here.
 */
async function onFoldAction(event: MouseEvent | KeyboardEvent, file: DiffFile) {
	const { currentTarget: diff, target } = event;
	const cell =
		target instanceof Element ? target.closest('tr')?.querySelector<HTMLElement>(DIFF_FOLD) : null;
	if (!(diff instanceof HTMLElement) || !(target instanceof Node) || !cell) return;
	if (event instanceof KeyboardEvent) event.preventDefault();
	if (!cell.contains(target) || event instanceof KeyboardEvent) cell.click();
	await nextTick();
	decorateDiff(diff, file);
}

const reviewFiles = computed<SkillUpdateFile[]>(
	() =>
		props.diffFiles ??
		props.skill.previewFiles.map((file) => ({
			path: file.path,
			before: file.text,
			after: file.text,
			beforeIsBinary: file.isBinary ? true : undefined,
			afterIsBinary: file.isBinary ? true : undefined,
		})),
);

const files = computed(() =>
	reviewFiles.value.map((file) => {
		const marks = findings.value.filter(
			(finding) => finding.file === file.path && finding.location,
		);

		const lines: Line[] =
			props.diffFiles || file.afterIsBinary
				? []
				: file.after.split('\n').map((text, index) => ({
						number: index + 1,
						segments: segmentsOf(
							text,
							marks.filter((finding) => finding.location?.line === index + 1),
						),
					}));
		// The server counts the lines of a skill with the same function, so the files add up to it.
		const { added, removed } =
			props.diffFiles && file.before !== file.after
				? diffText(file.before, file.after)
				: { added: 0, removed: 0 };
		return {
			...file,
			// A closed file must still say that it changed, and by how much.
			change: { added, removed },
			hasBinary: file.beforeIsBinary || file.afterIsBinary,
			hasText:
				(file.status !== 'added' && !file.beforeIsBinary) ||
				(file.status !== 'removed' && !file.afterIsBinary),
			marks,
			lines,
		};
	}),
);

const isSkippedScript = (finding: SkillScanFinding) =>
	finding.rule === 'file_skipped' && finding.severity !== 'info';

/** The skipped section lists each left-out script, so the notice has one line for all of them. */
const reviewFindings = computed(() =>
	findings.value.filter((finding) => finding.severity !== 'info' && !isSkippedScript(finding)),
);
const skippedScriptCount = computed(() => findings.value.filter(isSkippedScript).length);
const issueCount = computed(() => reviewFindings.value.length + (skippedScriptCount.value ? 1 : 0));
const skippedSection = useTemplateRef<HTMLElement>('skippedSection');

function goToSkipped() {
	skippedSection.value?.scrollIntoView({ block: 'start', inline: 'nearest' });
	skippedSection.value?.focus({ preventScroll: true });
}

const LIMIT_KEYS: Record<SkillScanLimitField, BaseTextKey> = {
	name: 'settings.context.skills.connect.check.limit.name',
	description: 'settings.context.skills.connect.check.limit.description',
	instructions: 'settings.context.skills.connect.check.limit.instructions',
	frontmatter: 'settings.context.skills.connect.check.limit.frontmatter',
	referenceCount: 'settings.context.skills.connect.check.limit.referenceCount',
	referencePath: 'settings.context.skills.connect.check.limit.referencePath',
	referenceContent: 'settings.context.skills.connect.check.limit.referenceContent',
	referencesTotal: 'settings.context.skills.connect.check.limit.referencesTotal',
};

/** Why a finding blocks the skill, in more words than the name of its rule. */
function blockedReason(finding: SkillScanFinding): string {
	if (finding.severity !== 'blocked') return '';
	if (finding.limit) {
		return i18n.baseText(LIMIT_KEYS[finding.limit.field], {
			interpolate: { max: finding.limit.max, current: finding.limit.current },
		});
	}
	// The server names what is wrong in one file. No other field of the finding has that reason.
	return finding.rule === 'invalid_skill' ? finding.detail : '';
}

function hasPreview(finding: SkillScanFinding): boolean {
	return reviewFiles.value.some(
		(file) =>
			file.path === finding.file &&
			(!finding.location || finding.location.line <= file.after.split('\n').length),
	);
}
</script>

<template>
	<div :class="$style.pane" data-test-id="skill-source-preview">
		<div :class="$style.content" data-test-id="skill-source-file-content">
			<N8nCallout
				v-if="issueCount"
				:theme="skill.check?.verdict === 'blocked' ? 'danger' : 'warning'"
				data-test-id="skill-source-findings"
			>
				<N8nText size="small" bold>{{
					i18n.baseText('settings.context.skills.connect.review.issues', {
						interpolate: { count: issueCount },
						adjustToNumber: issueCount,
					})
				}}</N8nText>
				<ul :class="$style.findings">
					<li
						v-for="(finding, index) in reviewFindings"
						:key="index"
						data-test-id="skill-source-finding"
					>
						<!-- Plain links: N8nLink has no theme that takes the color of the notice. -->
						<a
							v-if="finding.file && hasPreview(finding)"
							:href="`#${encodeURIComponent(fileId(finding.file))}`"
							:class="$style.findingLink"
							@click.prevent="goToFile(finding.file, finding.location?.line)"
							>{{ findingText(finding) }}</a
						>
						<a
							v-else-if="finding.file"
							:href="fileUrl(finding.file)"
							:class="$style.findingLink"
							target="_blank"
							rel="noopener noreferrer"
							>{{ findingText(finding) }} ·
							{{ i18n.baseText('settings.context.skills.synced.openInGithub') }}</a
						>
						<template v-else>{{ findingText(finding) }}</template>
						<div v-if="blockedReason(finding)" data-test-id="skill-source-finding-reason">
							{{ blockedReason(finding) }}
						</div>
					</li>
					<li v-if="skippedScriptCount" data-test-id="skill-source-skipped-scripts">
						<a
							:href="`#${encodeURIComponent(fileId('skipped'))}`"
							:class="$style.findingLink"
							@click.prevent="goToSkipped"
							>{{
								i18n.baseText('settings.context.skills.connect.review.skippedScripts', {
									interpolate: { count: skippedScriptCount },
									adjustToNumber: skippedScriptCount,
								})
							}}</a
						>
					</li>
				</ul>
			</N8nCallout>
			<section
				v-for="file in files"
				:id="fileId(file.path)"
				:key="file.path"
				ref="fileSections"
				:class="$style.file"
				:aria-label="file.path"
				tabindex="-1"
				data-test-id="skill-source-file"
			>
				<!-- A closed file stays in the page, so the search of the browser still finds its text. -->
				<CollapsibleRoot
					:open="openFiles.includes(file.path)"
					:unmount-on-hide="false"
					@update:open="setFileOpen(file.path, $event)"
				>
					<header
						:class="[$style.fileHeader, openFiles.includes(file.path) && $style.fileHeaderOpen]"
					>
						<CollapsibleTrigger as-child>
							<!-- A plain button: the path must wrap, which N8nButton does not do. -->
							<button
								type="button"
								:class="$style.fileToggle"
								data-test-id="skill-source-file-toggle"
							>
								<N8nIcon
									:icon="openFiles.includes(file.path) ? 'chevron-down' : 'chevron-right'"
									size="small"
									color="text-light"
								/>
								<N8nIcon icon="file-text" size="small" color="text-light" />
								<!-- The path in the skill, as n8n stores the file. The link goes to the full path. -->
								<N8nText size="small" :class="$style.path" data-test-id="skill-source-file-path">{{
									file.path
								}}</N8nText>
							</button>
						</CollapsibleTrigger>
						<N8nText v-if="file.status" size="small" data-test-id="skill-source-file-status">{{
							i18n.baseText(statusLabels[file.status])
						}}</N8nText>
						<SkillDiffCount
							:class="$style.counts"
							:count="file.change"
							:hide-zero="!!file.status"
							:title="
								i18n.baseText('settings.context.skills.updates.lines', {
									interpolate: file.change,
								})
							"
							data-test-id="skill-source-file-changes"
						/>
						<N8nTooltip
							v-if="file.status !== 'removed'"
							as-child
							:content="i18n.baseText('settings.context.skills.synced.openInGithub')"
							placement="top"
						>
							<N8nIconButton
								icon="external-link"
								variant="ghost"
								size="small"
								:href="fileUrl(file.path)"
								target="_blank"
								:aria-label="i18n.baseText('settings.context.skills.synced.openInGithub')"
								data-test-id="skill-source-file-link"
							/>
						</N8nTooltip>
					</header>
					<N8nAnimatedCollapsibleContent>
						<N8nText v-if="file.hasBinary" size="small" :class="$style.binary">
							{{
								i18n.baseText(
									file.hasText
										? 'agents.builder.skills.versions.binarySide'
										: 'agents.builder.skills.files.binary',
								)
							}}
						</N8nText>
						<pre v-if="!diffFiles && file.lines.length" :class="$style.text"><code><span
						v-for="line in file.lines"
						:key="line.number"
						:data-line="line.number"
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
							v-if="diffFiles && file.hasText"
							v-diff-decor="file"
							:class="$style.diff"
							:old-string="file.before"
							:new-string="file.after"
							language="plaintext"
							:context="DIFF_CONTEXT"
							data-test-id="skill-source-file-diff"
							@click="onFoldAction($event, file)"
							@keydown.enter.space="onFoldAction($event, file)"
						/>
					</N8nAnimatedCollapsibleContent>
				</CollapsibleRoot>
			</section>
			<N8nText
				v-if="skill.previewTruncated"
				size="small"
				color="text-light"
				data-test-id="skill-source-preview-truncated"
			>
				{{ i18n.baseText('settings.context.skills.connect.review.truncated') }}
			</N8nText>
			<section
				v-if="skippedFiles.length > 0"
				:id="fileId('skipped')"
				ref="skippedSection"
				:class="$style.skipped"
				:aria-label="i18n.baseText('settings.context.skills.connect.review.skippedFiles')"
				tabindex="-1"
			>
				<N8nText size="small" bold>
					{{ i18n.baseText('settings.context.skills.connect.review.skippedFiles') }}
				</N8nText>
				<ul>
					<li
						v-for="file in skippedFiles"
						:key="file.path"
						:class="$style.skippedFile"
						data-test-id="skill-source-skipped-file"
					>
						<N8nLink :href="fileUrl(file.path)" new-window theme="text" size="small">{{
							file.label
						}}</N8nLink>
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

/* A link in the notice has the color of the notice, in the warning theme and the danger theme. */
.findings .findingLink {
	color: inherit;
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

	/*
	 * One number for each line: its number in the new file. The cell of the old number keeps its
	 * place with no width, because the cell of a folded part spans the two number cells.
	 */
	:global(.blob-num):first-child:not([colspan]) {
		width: 0;
		min-width: 0;
		max-width: 0;
		padding: 0;
		overflow: hidden;
		font-size: 0;
	}

	/* A folded part is one grey row: an icon and "Show N unchanged lines", not the "> ⋯" of the viewer. */
	tr:has(:global(.blob-num-hunk[colspan])) td {
		background-color: var(--background--subtle);
		font-size: 0;
		cursor: pointer;

		&[data-label] {
			padding-block: var(--spacing--4xs);
			color: var(--text-color--subtle);
		}

		/* The chevrons-up-down icon. The viewer owns the row, so the row cannot hold an N8nIcon. */
		&[data-label]::before {
			content: '';
			display: inline-block;
			width: var(--font-size--2xs);
			height: var(--font-size--2xs);
			/* The label starts below the line numbers. */
			margin-inline: calc(-1 * var(--spacing--xl) - var(--spacing--2xs)) var(--spacing--2xs);
			vertical-align: middle;
			background-color: currentColor;
			mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 15 5 5 5-5'/%3E%3Cpath d='m7 9 5-5 5 5'/%3E%3C/svg%3E")
				center / contain no-repeat;
		}

		&[data-label]::after {
			content: attr(data-label);
			font-family: var(--font-family--monospace);
			font-size: var(--font-size--2xs);
			vertical-align: middle;
		}

		&:focus-visible {
			outline: var(--focus--border-width) solid var(--focus--outline-color);
			outline-offset: calc(-1 * var(--focus--border-width));
		}
	}

	/* The lines of an opened part look like the other unchanged lines. */
	:global(.blob-num-hunk):not([colspan]),
	:global(.blob-num-hunk):not([colspan]) ~ :global(.blob-code-hunk) {
		background-color: transparent;
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
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--4xs) var(--spacing--xs);
}

.fileHeaderOpen {
	border-bottom: var(--border);
}

/* The counts have the size of the path next to them. */
.counts {
	--skill-diff-count--font-size: var(--font-size--2xs);
}

.fileToggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--4xs) 0;
	text-align: start;
	background: none;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
}

.path {
	flex: 1;
	min-width: 0;
	overflow-wrap: anywhere;
	font-family: var(--font-family--monospace);
}

.binary {
	display: block;
	padding: var(--spacing--2xs) var(--spacing--xs);
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
