<script setup lang="ts">
import type { WorkflowSuggestionProposalDetail } from '@n8n/api-types';
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
import { useRouter } from 'vue-router';

const props = defineProps<{
	suggestions: WorkflowSuggestionProposalDetail[];
	triggeringWorkflowId: string;
	workflowNames: Map<string, string>;
}>();

const i18n = useI18n();
const router = useRouter();
const WorkflowDiffView = computed(() => componentRegistry.get('workflow-diff'));

const entries = computed(() =>
	props.suggestions
		.map((suggestion) => {
			const isFailing = suggestion.workflowId === props.triggeringWorkflowId;
			return {
				suggestion,
				name: props.workflowNames.get(suggestion.workflowId) ?? suggestion.workflowId,
				// A new window needs a resolved path. The link stringifies a route object.
				href: router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId: suggestion.workflowId },
				}).href,
				isFailing,
				role: i18n.baseText(
					isFailing
						? 'inbox.selfHealing.changes.failingWorkflow'
						: 'inbox.selfHealing.changes.subWorkflow',
				),
			};
		})
		.sort((a, b) => Number(b.isFailing) - Number(a.isFailing)),
);
const isMultiple = computed(() => entries.value.length > 1);
const hasFailingEntry = computed(() => entries.value.some(({ isFailing }) => isFailing));

const collapsedIds = ref(new Set<string>());

function setOpen(suggestionId: string, open: boolean) {
	if (open) collapsedIds.value.delete(suggestionId);
	else collapsedIds.value.add(suggestionId);
}

const panes = ref<HTMLElement | null>(null);
const navResizer = useResizablePanel({
	container: panes,
	width: {
		localStorageKey: 'N8N_SELF_HEALING_CHANGES_NAV_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.25, 200), 280),
		minSize: 180,
		maxSize: (size) => Math.min(size * 0.5, 480),
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
			const id = record.target.getAttribute('data-suggestion-id');
			if (!id) continue;
			if (record.isIntersecting) next.add(id);
			else next.delete(id);
		}
		visibleIds.value = next;
	},
	{ root: list, rootMargin: '50% 0px' },
);

function cardsOf(container: HTMLElement) {
	return [...container.querySelectorAll<HTMLElement>('[data-suggestion-id]')];
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
		activeId.value = cards.at(-1)?.dataset.suggestionId;
		return;
	}

	const probe = container.getBoundingClientRect().top + container.clientHeight / 3;
	const current = cards.filter((card) => card.getBoundingClientRect().top <= probe).at(-1);
	activeId.value = (current ?? cards[0])?.dataset.suggestionId;
}

async function select(suggestionId: string) {
	activeId.value = suggestionId;
	if (collapsedIds.value.has(suggestionId)) {
		setOpen(suggestionId, true);
		await nextTick();
	}
	const container = list.value;
	if (!container) return;

	const card = cardsOf(container).find((item) => item.dataset.suggestionId === suggestionId);
	// The scroll position must not pick another card, also when the last cards cannot reach the top.
	holdActiveCard();
	card?.scrollIntoView({ block: 'start' });
}

const suggestionIds = computed(() =>
	entries.value.map(({ suggestion }) => suggestion.suggestionId),
);

watch(
	() => suggestionIds.value.join(),
	() => {
		activeId.value = suggestionIds.value[0];
		collapsedIds.value = new Set();
	},
	{ immediate: true },
);
</script>

<template>
	<N8nCallout v-if="!WorkflowDiffView || entries.length === 0" theme="warning">
		{{ i18n.baseText('inbox.selfHealing.changes.unavailable') }}
	</N8nCallout>
	<div v-else ref="panes" :class="$style.panes" data-test-id="self-healing-changes-list">
		<N8nResizeWrapper
			v-if="isMultiple"
			:class="$style.navPane"
			:style="{ width: `${navResizer.width.value}px` }"
			:resizer="navResizer"
			:supported-directions="['right']"
		>
			<nav :class="$style.nav" :aria-label="i18n.baseText('inbox.selfHealing.changes.navigation')">
				<N8nText tag="div" size="xsmall" bold color="text-base" :class="$style.navHeading">
					{{ i18n.baseText('inbox.selfHealing.changes.workflows') }}
				</N8nText>
				<ul :class="$style.navList">
					<li v-for="entry in entries" :key="entry.suggestion.suggestionId">
						<button
							type="button"
							:class="[
								$style.navItem,
								{
									[$style.active]: activeId === entry.suggestion.suggestionId,
									[$style.nested]: hasFailingEntry && !entry.isFailing,
								},
							]"
							:title="entry.name"
							:aria-current="activeId === entry.suggestion.suggestionId ? 'true' : undefined"
							data-test-id="self-healing-changes-nav-item"
							@click="select(entry.suggestion.suggestionId)"
						>
							<N8nIcon icon="workflow" size="small" :class="$style.icon" />
							<N8nText size="small" color="text-dark" :class="$style.truncate">
								{{ entry.name }}
							</N8nText>
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
				:key="entry.suggestion.suggestionId"
				:open="!collapsedIds.has(entry.suggestion.suggestionId)"
				as-child
				@update:open="setOpen(entry.suggestion.suggestionId, $event)"
			>
				<article
					ref="cardElements"
					:class="[
						$style.card,
						{ [$style.activeCard]: isMultiple && activeId === entry.suggestion.suggestionId },
					]"
					:data-suggestion-id="entry.suggestion.suggestionId"
					data-test-id="self-healing-changes-card"
				>
					<header :class="$style.cardHeader">
						<N8nText tag="h3" size="medium" :class="$style.cardHeading">
							<component
								:is="isMultiple ? CollapsibleTrigger : 'span'"
								:class="[$style.cardTitle, { [$style.trigger]: isMultiple }]"
								data-test-id="self-healing-changes-card-toggle"
							>
								<N8nIcon icon="workflow" size="small" :class="$style.icon" />
								<N8nText
									bold
									size="medium"
									color="text-dark"
									:title="entry.name"
									:class="$style.truncate"
								>
									{{ entry.name }}
								</N8nText>
								<N8nText size="small" color="text-light" :class="$style.role">
									{{ entry.role }}
								</N8nText>
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
					<CollapsibleContent :class="$style.cardDiff">
						<component
							:is="WorkflowDiffView"
							v-if="!canObserve || visibleIds.has(entry.suggestion.suggestionId)"
							:source-snapshot="entry.suggestion.payload.original"
							:target-snapshot="entry.suggestion.payload.proposed"
							:workflow-id="entry.suggestion.workflowId"
							:workflow-name="entry.name"
							:source-label="i18n.baseText('inbox.selfHealing.changes.original')"
							:target-label="i18n.baseText('inbox.selfHealing.changes.proposed')"
							:canvas-id-prefix="entry.suggestion.suggestionId"
							:require-canvas-focus="isMultiple"
							hide-title
							show-fullscreen-button
						/>
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

.navPane {
	flex-shrink: 0;
	min-height: 0;
	border-right: var(--border);
}

.nav {
	height: 100%;
	min-height: 0;
	overflow-y: auto;
	padding-block: var(--spacing--sm) var(--spacing--md);
	padding-inline-end: var(--spacing--2xs);
}

.navList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.navHeading {
	display: flex;
	align-items: center;
	min-height: var(--height--sm);
	margin-bottom: var(--spacing--4xs);
	padding: 0 var(--spacing--2xs);
}

.navItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--md);
	padding: 0 var(--spacing--2xs);
	border: none;
	border-radius: var(--radius--3xs);
	background: none;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.nested {
	padding-inline-start: calc(var(--spacing--2xs) + var(--spacing--sm));
}

.active,
.active:hover {
	background-color: var(--background--active);
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.truncate {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
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
	padding-block: var(--spacing--sm) var(--spacing--md);
	padding-inline-start: var(--spacing--sm);
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

.activeCard {
	border-color: var(--border-color--strong);
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--xl);
	padding: 0 var(--spacing--sm);

	[data-state='open'] > & {
		border-bottom: var(--border);
	}
}

.cardHeading {
	display: flex;
	flex: 1;
	min-width: 0;
	align-self: stretch;
	margin: 0;
}

.cardTitle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.trigger {
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

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;

	[data-state='closed'] > & {
		transform: rotate(-90deg);
	}
}

.role {
	flex-shrink: 0;
	white-space: nowrap;
}

.openLink {
	flex-shrink: 0;
}

.openLinkText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.cardDiff {
	height: max(28rem, 70vh);
}

.single {
	padding-block: 0;
	padding-inline-start: 0;

	.card {
		flex: 1;
	}

	.cardDiff {
		flex: 1;
		height: auto;
		min-height: 0;
	}
}

/* The detail breakpoint of SelfHealingResultContent. Container queries cannot use CSS variables. */
@container assistant-detail (max-width: 44rem) {
	.navPane {
		display: none;
	}

	.cards {
		padding-inline-start: 0;
	}
}
</style>
