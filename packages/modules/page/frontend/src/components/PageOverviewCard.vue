<script setup lang="ts">
import { toResourcePath, type PageOverviewWorkflow } from '@n8n/api-types';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { CATEGORY_ICONS, TRIGGER_LABELS } from '../overview/overviewDisplay';
import { toTriggerFactText } from '../overview/triggerFact';
import { getPagePermissions } from '../page.permissions';

const NODE_ICON_PIXELS = 14;

const HEALTH_LABELS: Record<'success' | 'error', BaseTextKey> = {
	success: 'page.overview.card.health.success',
	error: 'page.overview.card.health.error',
};

/**
 * Shows one workflow of the documentation overview as a card.
 * A click on a card with a page emits `select-page`.
 * A click on a card without a page emits `write-page` when the user can create a page.
 * If the user cannot create a page, the click opens the workflow.
 */
const props = withDefaults(
	defineProps<{
		workflow: PageOverviewWorkflow;
		/** True while the page of this workflow is created. */
		isWriting?: boolean;
	}>(),
	{ isWriting: false },
);

const emit = defineEmits<{
	'select-page': [pageId: string];
	'write-page': [workflow: PageOverviewWorkflow];
}>();

const i18n = useI18n();
const router = useRouter();

const NodeIcon = computed(() => componentRegistry.get('node-icon'));

const page = computed(() => props.workflow.page);
const canWritePage = computed(() => getPagePermissions(props.workflow.projectId).canCreate);

const triggerFact = computed(() =>
	toTriggerFactText(props.workflow.trigger, (key, interpolate) =>
		i18n.baseText(key, { interpolate }),
	),
);

const lastStatus = computed(() => props.workflow.lastExecution?.status);
const healthLabel = computed(() =>
	lastStatus.value ? i18n.baseText(HEALTH_LABELS[lastStatus.value]) : undefined,
);

async function openWorkflow(): Promise<void> {
	await router.push(toResourcePath({ resourceType: 'workflow', resourceId: props.workflow.id }));
}

/** Does the one action of the card: show the page, write the page, or open the workflow. */
async function selectCard(): Promise<void> {
	if (page.value) {
		emit('select-page', page.value.id);
	} else if (canWritePage.value) {
		emit('write-page', props.workflow);
	} else {
		await openWorkflow();
	}
}
</script>

<template>
	<article
		:class="[
			$style.card,
			$style[workflow.category],
			page ? $style.documented : $style.undocumented,
			{ [$style.writing]: isWriting },
		]"
		:aria-busy="isWriting"
		:data-test-id="page ? 'page-overview-card' : 'page-overview-card-undocumented'"
		@click="selectCard"
	>
		<div :class="$style.meta">
			<span :class="$style.trigger" data-test-id="page-overview-card-trigger">
				<N8nIcon :icon="CATEGORY_ICONS[workflow.category]" size="xsmall" />
				{{ i18n.baseText(TRIGGER_LABELS[workflow.category]) }}
			</span>
			<span v-if="triggerFact" :class="$style.fact" data-test-id="page-overview-card-fact">
				{{ triggerFact }}
			</span>
			<span :class="$style.status">
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
				<N8nTooltip v-if="lastStatus" :content="healthLabel">
					<span
						:class="[$style.health, $style[lastStatus]]"
						role="img"
						:aria-label="healthLabel"
						:data-status="lastStatus"
						data-test-id="page-overview-health"
					/>
				</N8nTooltip>
			</span>
		</div>
		<div :class="$style.text">
			<h4 :class="$style.name" data-test-id="page-overview-card-name">{{ workflow.name }}</h4>
			<p v-if="page" :class="$style.excerpt" data-test-id="page-overview-card-excerpt">
				{{ page.excerpt || i18n.baseText('page.overview.card.noExcerpt') }}
			</p>
			<p v-else-if="canWritePage" :class="$style.excerpt" data-test-id="page-overview-card-write">
				{{ i18n.baseText('page.overview.card.writePage') }}
			</p>
		</div>
		<ul :class="$style.nodeIcons" data-test-id="page-overview-card-nodes">
			<li v-for="nodeType in workflow.nodeTypes" :key="nodeType" :class="$style.nodeIcon">
				<component :is="NodeIcon" v-if="NodeIcon" :node-type="nodeType" :size="NODE_ICON_PIXELS" />
				<N8nIcon v-else icon="box" size="small" />
			</li>
		</ul>
	</article>
</template>

<style lang="scss" module>
@use '../overview/accent';

@include accent.classes;

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	color: var(--text-color);
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		box-shadow var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&:focus-within {
		border-color: var(--border-color--strong);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.documented {
	&:hover,
	&:focus-within {
		box-shadow: var(--shadow--sm);
	}
}

.writing {
	cursor: progress;
	opacity: 0.6;
}

.undocumented {
	border-style: dashed;
	background-color: transparent;

	.name {
		color: var(--text-color--subtle);
	}
}

.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.trigger {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--page-overview--accent--color--background);
	color: var(--page-overview--accent--color--text);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	white-space: nowrap;
}

.fact {
	overflow: hidden;
	min-width: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.outdated {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background-color: var(--background--active);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
}

.health {
	display: inline-block;
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

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.name {
	display: -webkit-box;
	overflow: hidden;
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
	overflow-wrap: anywhere;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.excerpt {
	overflow: hidden;
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.nodeIcons {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	margin: 0;
	padding: 0;
	list-style: none;
	filter: grayscale(1);
	opacity: 0.5;
	transition:
		filter var(--duration--snappy) var(--easing--ease-out),
		opacity var(--duration--snappy) var(--easing--ease-out);

	.card:hover &,
	.card:focus-within & {
		filter: none;
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.nodeIcon {
	display: inline-flex;
	align-items: center;
	color: var(--text-color--subtler);
}
</style>
