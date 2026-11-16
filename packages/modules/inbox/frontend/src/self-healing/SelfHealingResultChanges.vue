<script setup lang="ts">
import type { SelfHealingResultDetail } from '@n8n/api-types';
import {
	N8nCallout,
	N8nIcon,
	N8nLink,
	N8nResizeWrapper,
	N8nText,
	useResizablePanel,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useIntersectionObserver, useTimeout } from '@vueuse/core';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, nextTick, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRouter } from 'vue-router';

import SelfHealingWorkflowLinks from './SelfHealingWorkflowLinks.vue';
import { buildWorkflowTree } from './selfHealingWorkflowTree';

const props = defineProps<{
	detail: Pick<SelfHealingResultDetail, 'workflowId' | 'workflows' | 'calls' | 'suggestions'>;
	workflowNames: Map<string, string>;
	projectName?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const WorkflowDiffView = computed(() => componentRegistry.get('workflow-diff'));

const nameOf = (workflowId: string) => props.workflowNames.get(workflowId) ?? workflowId;

const entries = computed(() =>
	buildWorkflowTree(props.detail).map(({ workflowId, suggestion, indent, callerIds }) => {
		const isFailing = workflowId === props.detail.workflowId;
		return {
			workflowId,
			suggestion,
			indent: props.projectName ? indent + 1 : indent,
			name: nameOf(workflowId),
			callers: callerIds.map((callerId) => ({ workflowId: callerId, name: nameOf(callerId) })),
			// A new window needs a resolved path. The link stringifies a route object.
			href: router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId } }).href,
			role: i18n.baseText(
				isFailing
					? 'inbox.selfHealing.changes.failingWorkflow'
					: 'inbox.selfHealing.changes.subWorkflow',
			),
		};
	}),
);
const isMultiple = computed(() => entries.value.length > 1);
const hasSuggestion = computed(() => props.detail.suggestions.length > 0);

const collapsedIds = ref(new Set<string>());

function setOpen(workflowId: string, open: boolean) {
	if (open) collapsedIds.value.delete(workflowId);
	else collapsedIds.value.add(workflowId);
}

const panes = ref<HTMLElement | null>(null);
const treeResizer = useResizablePanel({
	container: panes,
	width: {
		localStorageKey: 'N8N_SELF_HEALING_CHANGES_NAV_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.28, 240), 360),
		minSize: 200,
		maxSize: (size) => Math.min(size * 0.5, 640),
		snap: true,
	},
});

const SCROLL_SETTLE_MS = 150;

const list = ref<HTMLElement | null>(null);
const cardElements = ref<HTMLElement[]>([]);
const activeId = ref<string>();
const visibleIds = ref(new Set<string>());
const { isPending: scrollingToCard, start: holdActiveCard } = useTimeout(SCROLL_SETTLE_MS, {
	controls: true,
	immediate: false,
});

const { isSupported: canObserve } = useIntersectionObserver(
	cardElements,
	(records) => {
		const next = new Set(visibleIds.value);
		for (const record of records) {
			const id = record.target.getAttribute('data-entry-id');
			if (!id) continue;
			if (record.isIntersecting) next.add(id);
			else next.delete(id);
		}
		visibleIds.value = next;
	},
	{ root: list, rootMargin: '50% 0px' },
);

function cardsOf(container: HTMLElement) {
	return [...container.querySelectorAll<HTMLElement>('[data-entry-id]')];
}

function syncActive() {
	if (scrollingToCard.value) {
		holdActiveCard();
		return;
	}
	const container = list.value;
	if (!container) return;

	const cards = cardsOf(container);
	const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
	if (atBottom) {
		activeId.value = cards.at(-1)?.dataset.entryId;
		return;
	}

	const probe = container.getBoundingClientRect().top + container.clientHeight / 3;
	const current = cards.filter((card) => card.getBoundingClientRect().top <= probe).at(-1);
	activeId.value = (current ?? cards[0])?.dataset.entryId;
}

async function select(workflowId: string) {
	activeId.value = workflowId;
	if (collapsedIds.value.has(workflowId)) {
		setOpen(workflowId, true);
		await nextTick();
	}
	const container = list.value;
	if (!container) return;

	const card = cardsOf(container).find((item) => item.dataset.entryId === workflowId);
	// The scroll position must not pick another card, also when the last cards cannot reach the top.
	holdActiveCard();
	card?.scrollIntoView({ block: 'start' });
}

const workflowIds = computed(() => entries.value.map(({ workflowId }) => workflowId));

watch(
	() => workflowIds.value.join(),
	() => {
		activeId.value = workflowIds.value[0];
		collapsedIds.value = new Set();
	},
	{ immediate: true },
);
</script>

<template>
	<N8nCallout v-if="!WorkflowDiffView || !hasSuggestion" theme="warning">
		{{ i18n.baseText('inbox.selfHealing.changes.unavailable') }}
	</N8nCallout>
	<div v-else ref="panes" :class="$style.panes" data-test-id="self-healing-changes-list">
		<N8nResizeWrapper
			:class="$style.treePane"
			:style="{ width: `${treeResizer.width.value}px` }"
			:resizer="treeResizer"
			:supported-directions="['right']"
		>
			<nav :class="$style.tree" :aria-label="i18n.baseText('inbox.selfHealing.changes.navigation')">
				<div :class="$style.heading">
					<N8nText step="2xs" bold color="text-base">
						{{ i18n.baseText('inbox.selfHealing.changes.workflows') }}
					</N8nText>
				</div>
				<ul :class="$style.list" role="list">
					<li
						v-if="projectName"
						:class="[$style.row, $style.project]"
						data-test-id="self-healing-changes-project"
					>
						<span :class="$style.name" :title="projectName">
							<N8nIcon icon="layers" size="small" :class="$style.icon" />
							<span :class="$style.text">
								<N8nText step="xs" color="text-dark" :class="$style.label">
									{{ projectName }}
								</N8nText>
							</span>
						</span>
					</li>
					<li
						v-for="entry in entries"
						:key="entry.workflowId"
						:class="[$style.row, { [$style.inspected]: activeId === entry.workflowId }]"
					>
						<button
							type="button"
							:class="[$style.name, $style.select]"
							:style="{ '--changes-tree--indent': entry.indent }"
							:title="entry.name"
							:aria-current="activeId === entry.workflowId ? 'true' : undefined"
							data-test-id="self-healing-changes-nav-item"
							@click="select(entry.workflowId)"
						>
							<N8nIcon icon="workflow" size="small" :class="$style.icon" />
							<span :class="$style.text">
								<N8nText step="xs" color="text-dark" :class="$style.label">
									{{ entry.name }}
								</N8nText>
								<N8nText
									v-if="!entry.suggestion"
									step="2xs"
									color="text-light"
									:class="$style.meta"
								>
									{{ i18n.baseText('inbox.selfHealing.changes.unchanged') }}
								</N8nText>
							</span>
						</button>
					</li>
				</ul>
			</nav>
		</N8nResizeWrapper>
		<div
			ref="list"
			:class="[$style.cards, { [$style.single]: !isMultiple }]"
			@scroll.passive="syncActive"
		>
			<CollapsibleRoot
				v-for="entry in entries"
				:key="entry.workflowId"
				:open="!collapsedIds.has(entry.workflowId)"
				as-child
				@update:open="setOpen(entry.workflowId, $event)"
			>
				<article
					ref="cardElements"
					:class="[
						$style.card,
						{ [$style.inspected]: isMultiple && activeId === entry.workflowId },
					]"
					:data-entry-id="entry.workflowId"
					data-test-id="self-healing-changes-card"
				>
					<header :class="$style.header">
						<N8nText tag="h3" size="medium" :class="$style.headingLevel">
							<component
								:is="isMultiple ? CollapsibleTrigger : 'span'"
								:class="[$style.trigger, { [$style.toggle]: isMultiple }]"
								data-test-id="self-healing-changes-card-toggle"
							>
								<N8nIcon icon="workflow" size="small" :class="$style.icon" />
								<span :class="$style.cardHeading">
									<N8nText
										bold
										size="medium"
										color="text-dark"
										:title="entry.name"
										:class="$style.label"
									>
										{{ entry.name }}
									</N8nText>
									<N8nText step="xs" color="text-light" :class="$style.meta">
										{{ entry.role }}
									</N8nText>
								</span>
								<N8nIcon
									v-if="isMultiple"
									icon="chevron-down"
									size="small"
									:class="$style.chevron"
								/>
							</component>
						</N8nText>
						<N8nLink
							:to="entry.href"
							:aria-label="
								i18n.baseText('inbox.selfHealing.changes.openWorkflowLabel', {
									interpolate: { name: entry.name },
								})
							"
							new-window
							theme="text"
							size="small"
							:underline="false"
							:class="$style.openLink"
						>
							<span :class="$style.openLinkText">
								{{ i18n.baseText('inbox.selfHealing.changes.openWorkflow') }}
								<N8nIcon icon="external-link" size="small" />
							</span>
						</N8nLink>
					</header>
					<CollapsibleContent :class="$style.body">
						<div v-if="entry.suggestion" :class="$style.diff">
							<component
								:is="WorkflowDiffView"
								v-if="!canObserve || visibleIds.has(entry.workflowId)"
								:source-snapshot="entry.suggestion.payload.original"
								:target-snapshot="entry.suggestion.payload.proposed"
								:workflow-id="entry.workflowId"
								:workflow-name="entry.name"
								:source-label="i18n.baseText('inbox.selfHealing.changes.original')"
								:target-label="i18n.baseText('inbox.selfHealing.changes.proposed')"
								:canvas-id-prefix="entry.suggestion.suggestionId"
								:require-canvas-focus="isMultiple"
								hide-title
								show-fullscreen-button
							/>
						</div>
						<N8nText
							v-else
							tag="div"
							step="xs"
							color="text-light"
							:class="$style.padded"
							data-test-id="self-healing-changes-card-unchanged"
						>
							{{ i18n.baseText('inbox.selfHealing.changes.noChanges') }}
						</N8nText>
						<footer v-if="entry.callers.length > 0" :class="$style.footer">
							<N8nText
								step="2xs"
								color="text-light"
								data-test-id="self-healing-changes-card-callers"
							>
								<I18nT keypath="inbox.selfHealing.changes.calledBy" scope="global">
									<template #names>
										<SelfHealingWorkflowLinks :workflows="entry.callers" @select="select" />
									</template>
								</I18nT>
							</N8nText>
						</footer>
					</CollapsibleContent>
				</article>
			</CollapsibleRoot>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.panes {
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
}

/* The tree and cards copy the promotion review, so both reviews of the inbox look the same. */
.treePane {
	flex-shrink: 0;
	min-height: 0;
	/* Takes back the inset of the tree and its rows, so the row text lines up with the heading. */
	margin-left: calc(-2 * var(--spacing--2xs));
	border-right: var(--border);
}

.tree {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--xs) var(--spacing--2xs);
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.heading {
	display: flex;
	align-items: center;
	min-height: var(--height--sm);
	padding: 0 var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius--3xs);

	&:not(.project):hover {
		background-color: var(--background--hover);
	}
}

.row.inspected,
.row.inspected:hover {
	background-color: var(--background--active);
}

.name {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	align-self: stretch;
	padding-left: calc(var(--changes-tree--indent, 0) * var(--spacing--xs));
}

.select {
	padding-block: 0;
	padding-right: 0;
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.text {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	flex-shrink: 0;
	white-space: nowrap;
}

.cards {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--sm) 0 var(--spacing--sm) var(--spacing--sm);
	scroll-behavior: smooth;
	scroll-padding-block-start: var(--spacing--sm);

	@media (prefers-reduced-motion: reduce) {
		scroll-behavior: auto;
	}
}

.card {
	display: flex;
	flex-shrink: 0;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.card.inspected {
	border-color: var(--border-color--strong);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--xl);
	padding: 0 var(--spacing--sm);

	[data-state='open'] > & {
		border-bottom: var(--border);
	}
}

.headingLevel {
	display: flex;
	flex: 1;
	min-width: 0;
	align-self: stretch;
	margin: 0;
}

.trigger {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.toggle {
	padding: 0;
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.cardHeading {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;

	[data-state='closed'] > & {
		transform: rotate(-90deg);
	}
}

.openLink {
	flex-shrink: 0;
}

.openLinkText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.body {
	display: flex;
	flex-direction: column;
}

.diff {
	height: max(28rem, 70vh);
}

.padded {
	padding: var(--spacing--xs) var(--spacing--sm);
}

.footer {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border);
}

.single {
	.card,
	.body,
	.diff {
		flex: 1;
		min-height: 0;
	}

	.diff {
		height: auto;
	}
}

/* The detail breakpoint of SelfHealingResultContent. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.treePane {
		display: none;
	}

	.cards {
		padding-inline-start: 0;
	}
}
</style>
