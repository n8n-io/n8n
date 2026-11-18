<script setup lang="ts">
import { toResourcePath, type PageOverviewWorkflow } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { toPageTourRoute } from '../composables/usePageTourStart';
import { getPagePermissions } from '../page.permissions';
import { CATEGORY_ICONS, TRIGGER_LABELS } from '../overview/overviewDisplay';
import { toTriggerFact } from '../overview/triggerFact';
import { toResourceDisplay } from '../resources/resourceDisplay';
import ResourceIcon from '../resources/ResourceIcon.vue';

const NODE_ICON_PIXELS = 20;

const HEALTH_LABELS: Record<'success' | 'error', BaseTextKey> = {
	success: 'page.overview.card.health.success',
	error: 'page.overview.card.health.error',
};

/**
 * Shows one workflow of the documentation overview as a card.
 * A workflow with a page shows the start of that page. A click on the card emits `select-page`.
 * A workflow without a page shows a muted card that can emit `write-page`.
 */
const props = withDefaults(
	defineProps<{
		workflow: PageOverviewWorkflow;
		/** Shows the name of the project of the workflow. */
		showProject?: boolean;
		/** True while the page of this workflow is created. */
		isWriting?: boolean;
	}>(),
	{ showProject: false, isWriting: false },
);

const emit = defineEmits<{
	'select-page': [pageId: string];
	'write-page': [workflow: PageOverviewWorkflow];
}>();

const i18n = useI18n();
const router = useRouter();

const NodeIcon = computed(() => componentRegistry.get('node-icon'));

const page = computed(() => props.workflow.page);
const pageDisplay = computed(() =>
	page.value ? toResourceDisplay('page', page.value.title) : undefined,
);
const otherPageCount = computed(() => props.workflow.pageCount - 1);
const workflowPath = computed(() =>
	toResourcePath({ resourceType: 'workflow', resourceId: props.workflow.id }),
);
/** The address with the base path of the instance, so that the browser can open it in a new tab. */
const workflowAddress = computed(() => router.resolve(workflowPath.value).href);
const canWritePage = computed(() => getPagePermissions(props.workflow.projectId).canCreate);

const triggerFact = computed(() =>
	toTriggerFact(props.workflow.trigger, (key, interpolate) => i18n.baseText(key, { interpolate })),
);

const lastStatus = computed(() => props.workflow.lastExecution?.status);
const healthLabel = computed(() =>
	lastStatus.value ? i18n.baseText(HEALTH_LABELS[lastStatus.value]) : undefined,
);
const readLabel = computed(() =>
	i18n.baseText(
		lastStatus.value === 'error' ? 'page.overview.card.openRunbook' : 'page.overview.card.read',
	),
);

function selectPage(): void {
	if (page.value) {
		emit('select-page', page.value.id);
	}
}

function opensNewTab(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey;
}

/** Opens the workflow in the app. A modified click keeps the browser behavior. */
function openWorkflow(event: MouseEvent): void {
	if (!opensNewTab(event)) {
		event.preventDefault();
		void router.push(workflowPath.value);
	}
}

async function startTour(): Promise<void> {
	if (page.value) {
		await router.push(toPageTourRoute(props.workflow.id, page.value.id));
	}
}
</script>

<template>
	<article
		:class="[
			$style.card,
			$style[workflow.category],
			page ? $style.documented : $style.undocumented,
		]"
		:data-test-id="page ? 'page-overview-card' : 'page-overview-card-undocumented'"
		@click="selectPage"
	>
		<N8nTooltip
			v-if="page?.outdated"
			:content="i18n.baseText('page.overview.card.outdated.tooltip')"
		>
			<span
				:class="$style.outdated"
				:aria-label="i18n.baseText('page.overview.card.outdated.tooltip')"
				data-test-id="page-overview-outdated"
			>
				{{ i18n.baseText('page.overview.card.outdated') }}
			</span>
		</N8nTooltip>
		<div :class="$style.band">
			<span :class="$style.trigger" data-test-id="page-overview-card-trigger">
				<N8nIcon :icon="CATEGORY_ICONS[workflow.category]" size="xsmall" />
				{{ i18n.baseText(TRIGGER_LABELS[workflow.category]) }}
			</span>
			<ul :class="$style.nodeIcons" data-test-id="page-overview-card-nodes">
				<li v-for="nodeType in workflow.nodeTypes" :key="nodeType" :class="$style.nodeIcon">
					<component
						:is="NodeIcon"
						v-if="NodeIcon"
						:node-type="nodeType"
						:size="NODE_ICON_PIXELS"
					/>
					<N8nIcon v-else icon="box" size="medium" />
				</li>
			</ul>
			<span v-if="workflow.active" :class="$style.active" data-test-id="page-overview-card-active">
				{{ i18n.baseText('page.overview.card.active') }}
			</span>
		</div>
		<div :class="$style.body">
			<div :class="$style.heading">
				<N8nTooltip v-if="lastStatus" :content="healthLabel">
					<span
						:class="[$style.health, $style[lastStatus]]"
						role="img"
						:aria-label="healthLabel"
						:data-status="lastStatus"
						data-test-id="page-overview-health"
					/>
				</N8nTooltip>
				<h4 :class="$style.name" data-test-id="page-overview-card-name">{{ workflow.name }}</h4>
			</div>
			<span v-if="triggerFact" :class="$style.fact" data-test-id="page-overview-card-fact">
				<N8nIcon :icon="triggerFact.icon" size="xsmall" :class="$style.factIcon" />
				<span :class="$style.factText">{{ triggerFact.text }}</span>
			</span>
			<span v-if="showProject" :class="$style.project" data-test-id="page-overview-card-project">
				{{ workflow.projectName }}
			</span>
			<template v-if="page && pageDisplay">
				<p :class="$style.excerpt" data-test-id="page-overview-card-excerpt">
					{{ page.excerpt || i18n.baseText('page.overview.card.noExcerpt') }}
				</p>
				<span :class="$style.pageTitle">
					<ResourceIcon :icon="pageDisplay.icon" :emoji="pageDisplay.emoji" size="xsmall" />
					<span :class="$style.pageTitleText">{{ pageDisplay.text }}</span>
					<span v-if="otherPageCount > 0" data-test-id="page-overview-card-more-pages">
						{{
							i18n.baseText('page.overview.card.morePages', {
								interpolate: { count: String(otherPageCount) },
							})
						}}
					</span>
				</span>
			</template>
			<p v-else :class="$style.noPage">{{ i18n.baseText('page.overview.card.noPage') }}</p>
		</div>
		<footer :class="$style.footer">
			<template v-if="page">
				<N8nButton
					variant="outline"
					size="small"
					icon="book-open"
					:label="readLabel"
					data-test-id="page-overview-card-read"
					@click.stop="selectPage"
				/>
				<N8nButton
					v-if="page.hasTour"
					variant="ghost"
					size="small"
					icon="play"
					:label="i18n.baseText('page.overview.card.tour')"
					data-test-id="page-overview-card-tour"
					@click.stop="startTour"
				/>
			</template>
			<N8nButton
				v-else-if="canWritePage"
				variant="outline"
				size="small"
				icon="pencil"
				:label="i18n.baseText('page.overview.card.writePage')"
				:loading="isWriting"
				data-test-id="page-overview-card-write"
				@click.stop="emit('write-page', workflow)"
			/>
			<N8nTooltip :content="i18n.baseText('page.overview.card.openWorkflow')">
				<a
					:href="workflowAddress"
					:class="$style.workflowLink"
					:aria-label="i18n.baseText('page.overview.card.openWorkflow')"
					data-test-id="page-overview-card-open-workflow"
					@click.stop="openWorkflow"
				>
					<N8nIcon icon="external-link" size="small" />
				</a>
			</N8nTooltip>
		</footer>
	</article>
</template>

<style lang="scss" module>
@use '../overview/accent';

@include accent.classes;

.card {
	position: relative;
	display: flex;
	flex-direction: column;
	min-width: 0;
	border: var(--border);
	border-color: var(--page-overview--accent--border-color);
	border-radius: var(--radius--xl);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--xs);
	color: var(--text-color);
	transition:
		transform var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.documented {
	cursor: pointer;

	&:hover,
	&:focus-within {
		box-shadow: var(--shadow--md);
		transform: translateY(calc(-1 * var(--spacing--4xs))) rotate(-0.4deg);

		@media (prefers-reduced-motion: reduce) {
			transform: none;
		}
	}
}

.undocumented {
	border-style: dashed;
	background-color: transparent;
	box-shadow: none;

	.band {
		border-bottom-style: dashed;
		background-color: transparent;
	}

	.nodeIcons {
		opacity: 0.6;
	}

	.name {
		color: var(--text-color--subtle);
	}
}

.band {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--2xs);
	border-bottom: var(--border);
	border-bottom-color: var(--page-overview--accent--border-color);
	border-radius: calc(var(--radius--xl) - var(--spacing--5xs))
		calc(var(--radius--xl) - var(--spacing--5xs)) 0 0;
	background-color: var(--page-overview--accent--color--background);
	color: var(--sticky--color--text);
}

.trigger {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-color: var(--page-overview--accent--border-color);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	color: var(--text-color);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
}

.nodeIcons {
	display: flex;
	flex: 1;
	flex-wrap: wrap;
	min-width: 0;
	align-items: center;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.nodeIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	color: var(--text-color--subtle);
}

.active {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	color: var(--text-color);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);

	&::before {
		width: var(--spacing--3xs);
		height: var(--spacing--3xs);
		border-radius: var(--radius--full);
		background-color: var(--color--success);
		content: '';
	}
}

.outdated {
	position: absolute;
	top: calc(-1 * var(--spacing--xs));
	right: var(--spacing--sm);
	z-index: 1;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-color: var(--sticky--border-color--variant-1);
	border-radius: var(--radius--sm);
	background-color: var(--sticky--color--background--variant-1);
	box-shadow: var(--shadow--xs);
	color: var(--sticky--color--text);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	transform: rotate(3deg);
}

.body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--xs);
}

.heading {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.health {
	display: inline-block;
	flex-shrink: 0;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: var(--radius--full);
}

.success {
	background-color: var(--color--success);
}

.error {
	background-color: var(--color--danger);
}

.name {
	display: -webkit-box;
	overflow: hidden;
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
	overflow-wrap: anywhere;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.fact {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.factIcon {
	flex-shrink: 0;
}

.factText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.project {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.excerpt,
.noPage {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.excerpt {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
}

.noPage {
	color: var(--text-color--subtler);
}

.pageTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	margin-top: auto;
	padding-top: var(--spacing--3xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.pageTitleText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.workflowLink {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-left: auto;
	padding: var(--spacing--3xs);
	border-radius: var(--radius--md);
	color: var(--text-color--subtle);

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}
</style>
