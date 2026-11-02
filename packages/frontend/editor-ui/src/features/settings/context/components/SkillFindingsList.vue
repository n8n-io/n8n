<script setup lang="ts">
import { computed } from 'vue';
import type { SkillScanFinding, SkillScanLocation, SkillScanPart } from '@n8n/api-types';
import { N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useSkillSourceReasons } from '../skills.utils';

const props = defineProps<{ findings: SkillScanFinding[] }>();

const i18n = useI18n();
const { ruleText } = useSkillSourceReasons();

const SEVERITY_ORDER = { blocked: 0, needs_review: 1, info: 2 } as const;

/** The callout of a finding. The icon repeats the severity, so it does not rely on colour alone. */
const SEVERITY_CALLOUTS = {
	blocked: { theme: 'danger', icon: 'circle-x' },
	needs_review: { theme: 'warning', icon: 'triangle-alert' },
	info: { theme: 'info', icon: 'circle-alert' },
} as const;

const PART_LABELS = {
	name: 'settings.context.skills.connect.preview.part.name',
	description: 'settings.context.skills.connect.preview.part.description',
	frontmatter: 'settings.context.skills.connect.preview.part.frontmatter',
	instructions: 'settings.context.skills.connect.preview.part.instructions',
} satisfies Record<SkillScanPart, BaseTextKey>;

/** The most severe findings first. */
const sorted = computed(() =>
	[...props.findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
);

/** Only multi-line texts have useful line numbers: the instructions and the reference files. */
function hasLineNumbers(location: SkillScanLocation): boolean {
	return !location.part || location.part === 'instructions';
}

/** Where a finding is, such as "SKILL.md (instructions)". */
function locationText(finding: SkillScanFinding): string {
	const file = finding.file ?? '';
	const part = finding.location?.part;
	if (!part) return file;
	return i18n.baseText('settings.context.skills.connect.preview.locationPartOnly', {
		interpolate: { file, part: i18n.baseText(PART_LABELS[part]) },
	});
}

/** The callout text of a finding, such as "Hidden Unicode characters in references/files.md". */
function findingTitle(finding: SkillScanFinding): string {
	const name = ruleText(finding.rule);
	if (!finding.file) return name;
	return i18n.baseText('settings.context.skills.connect.check.findingInFile', {
		interpolate: { finding: name, file: locationText(finding) },
	});
}

/** The snippet lines, with the finding split out of its line so the template can mark it. */
function snippetRows(location: SkillScanLocation) {
	return location.snippet.map(({ line, text }) =>
		line === location.line
			? {
					line,
					isMatch: true,
					before: text.slice(0, location.start),
					match: text.slice(location.start, location.end),
					after: text.slice(location.end),
				}
			: { line, isMatch: false, before: text, match: '', after: '' },
	);
}
</script>

<template>
	<ul :class="$style.findings" data-test-id="skill-findings">
		<li
			v-for="(finding, index) in sorted"
			:key="index"
			:class="$style.finding"
			data-test-id="skill-source-preview-finding"
		>
			<N8nCallout
				:theme="SEVERITY_CALLOUTS[finding.severity].theme"
				:icon="SEVERITY_CALLOUTS[finding.severity].icon"
				icon-size="small"
				slim
				data-test-id="skill-source-preview-finding-callout"
			>
				{{ findingTitle(finding) }}
			</N8nCallout>
			<!-- The snippet shows the problem, so the detail text is only for findings without one. -->
			<N8nText v-if="!finding.location" size="small" color="text-base">
				{{ finding.detail }}
			</N8nText>
			<pre v-else :class="$style.snippet"><code><span
				v-for="row in snippetRows(finding.location)"
				:key="row.line"
				:class="[
					$style.snippetLine,
					row.isMatch && [$style.snippetLineMatch, $style[`line-${finding.severity}`]],
				]"
			><span
				v-if="hasLineNumbers(finding.location)"
				:class="$style.lineNumber"
			>{{ row.line }}</span><span :class="$style.lineText">{{ row.before }}<mark
				v-if="row.isMatch"
				:class="[$style.mark, $style[`mark-${finding.severity}`]]"
			>{{ row.match }}</mark>{{ row.after }}</span></span></code></pre>
		</li>
	</ul>
</template>

<style lang="scss" module>
.findings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin: 0;
	padding: 0;
	list-style: none;
}

.finding {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	& + & {
		padding-top: var(--spacing--sm);
		border-top: var(--border);
	}
}

.snippet {
	margin: 0;
	padding: var(--spacing--2xs) 0;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	background-color: var(--background--subtle);
	border-radius: var(--radius);

	code {
		display: flex;
		flex-direction: column;
	}
}

.snippetLine {
	display: flex;
	padding-inline-end: var(--spacing--xs);
	color: var(--color--text--tint-1);
}

.snippetLineMatch {
	color: var(--color--text);
}

.line-needs_review {
	background-color: var(--callout--color--background--warning);
}

.line-blocked {
	background-color: var(--callout--color--background--danger);
}

.line-info {
	background-color: var(--background--active);
}

.lineNumber {
	flex-shrink: 0;
	width: var(--spacing--xl);
	padding-inline-end: var(--spacing--2xs);
	color: var(--color--text--tint-1);
	text-align: right;
	user-select: none;
}

/* Long lines wrap. A run of hidden-character markers has no spaces, so it can break anywhere. */
.lineText {
	flex: 1;
	min-width: 0;
	padding-inline-start: var(--spacing--2xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.mark {
	padding: 0 var(--spacing--5xs);
	color: inherit;
	border-radius: var(--radius--sm, 2px);
}

.mark-needs_review {
	background-color: var(--callout--border-color--warning);
}

.mark-blocked {
	background-color: var(--callout--border-color--danger);
}

.mark-info {
	background-color: var(--color--foreground);
}
</style>
