<script setup lang="ts">
// Prototype: the one list of issues of a review preview. A callout carries the verdict. It is
// yellow for Blocked too: red belongs to the removed lines of the diff.
// `rows`: the issues are neutral rows under the callout, each with its icon.
// `bullets`: the issues are a bullet list inside the callout, with no icons.
// An issue with a place in the skill jumps to it.
import type { SkillScanVerdict } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { SEVERITY_ICONS, type ReviewIssueSeverity } from './skillChangeReview';

export type ReviewIssueRow = {
	id: string;
	severity: ReviewIssueSeverity;
	title: string;
	detail?: string;
	/** Where the issue is, such as `SKILL.md:14`. */
	location?: string;
	/** The issue has a place to jump to. */
	canJump: boolean;
};

const props = withDefaults(
	defineProps<{
		verdict: SkillScanVerdict;
		issues: ReviewIssueRow[];
		layout?: 'rows' | 'bullets';
	}>(),
	{ layout: 'rows' },
);

const emit = defineEmits<{ select: [id: string] }>();

const i18n = useI18n();

function verdictText() {
	const count = props.issues.length;
	return i18n.baseText(
		props.verdict === 'blocked'
			? 'settings.context.skills.reviewA.verdict.blocked'
			: 'settings.context.skills.reviewA.verdict.needsReview',
		{ interpolate: { count }, adjustToNumber: count },
	);
}

const verdictSeverity = () => (props.verdict === 'blocked' ? 'blocked' : 'needs_review');
</script>

<template>
	<section :class="$style.issues" data-test-id="skill-change-review-issues">
		<N8nCallout
			v-if="layout === 'bullets'"
			theme="warning"
			iconless
			:class="$style.callout"
			data-test-id="skill-change-review-verdict"
		>
			<span :class="$style.calloutHeader">
				<N8nIcon :icon="SEVERITY_ICONS[verdictSeverity()].icon" size="small" />
				{{ verdictText() }}
			</span>
			<ul :class="$style.bullets">
				<li v-for="issue in issues" :key="issue.id" data-test-id="skill-change-review-issue">
					<button
						v-if="issue.canJump"
						type="button"
						:class="$style.bulletLink"
						@click="emit('select', issue.id)"
					>
						{{ issue.title }}
					</button>
					<span v-else>{{ issue.title }}</span>
					<span v-if="issue.location" :class="$style.muted"> · {{ issue.location }}</span>
					<span v-if="issue.detail" :class="[$style.muted, $style.detail]">{{ issue.detail }}</span>
				</li>
			</ul>
		</N8nCallout>
		<N8nCallout
			v-else
			theme="warning"
			:icon="SEVERITY_ICONS[verdictSeverity()].icon"
			slim
			icon-size="small"
			data-test-id="skill-change-review-verdict"
		>
			{{ verdictText() }}
		</N8nCallout>
		<ul v-if="layout === 'rows'" :class="$style.list">
			<li v-for="issue in issues" :key="issue.id">
				<component
					:is="issue.canJump ? 'button' : 'div'"
					:type="issue.canJump ? 'button' : undefined"
					:class="[$style.issue, issue.canJump && $style.link]"
					data-test-id="skill-change-review-issue"
					@click="issue.canJump && emit('select', issue.id)"
				>
					<N8nIcon
						:icon="SEVERITY_ICONS[issue.severity].icon"
						:color="SEVERITY_ICONS[issue.severity].color"
						size="small"
						:class="$style.icon"
					/>
					<span :class="$style.text">
						<N8nText size="small">{{ issue.title }}</N8nText>
						<N8nText v-if="issue.detail" size="small" color="text-light">
							{{ issue.detail }}
						</N8nText>
					</span>
					<N8nText v-if="issue.location" size="xsmall" color="text-light" :class="$style.location">
						{{ issue.location }}
					</N8nText>
					<N8nIcon
						v-if="issue.canJump"
						icon="chevron-right"
						size="small"
						color="text-light"
						:class="$style.icon"
					/>
				</component>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.issues {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

/* Bullets: the callout holds a header line and the list, so it starts at the top. */
.callout.callout {
	align-items: flex-start;
}

.calloutHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-weight: var(--font-weight--medium);
}

.bullets {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: var(--spacing--3xs) 0 0;
	padding-inline-start: calc(var(--spacing--sm) + var(--spacing--4xs));
	list-style: disc;
}

.bulletLink {
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		text-decoration: underline;
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

.muted {
	color: var(--text-color--subtle);
}

.detail {
	display: block;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.issue {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	font: inherit;
	text-align: left;
}

.link {
	cursor: pointer;

	/* The same hover as the rows of the skill list. */
	&:hover {
		background-color: var(--background--hover, var(--color--background--light-2));
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: -2px;
	}
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.location {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
}
</style>
