<script setup lang="ts">
import { ref, watch } from 'vue';
import {
	N8nButton,
	N8nDialogBody,
	N8nDropdownMenu,
	N8nIcon,
	N8nListbox,
	N8nListboxItem,
	N8nModalSidebar,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps, IconColor, IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type {
	SkillDecision,
	SkillReviewGroup,
	SkillReviewItem,
	SkillStatusKind,
} from './skillReview.types';

/**
 * The body of the skill review dialogs: the skills on the left, each with an accept or reject
 * menu, and the preview of the selected skill on the right.
 */
const props = defineProps<{
	groups: SkillReviewGroup[];
	/** The user can accept or reject. Without it, the rows only preview. */
	canDecide: boolean;
}>();

const previewId = defineModel<string | null>('previewId', { required: true });
const decisions = defineModel<Record<string, SkillDecision>>('decisions', { required: true });

defineSlots<{
	/** The preview of the selected skill. */
	default?: () => unknown;
	/** The list content when no group has a skill. */
	empty?: () => unknown;
	/** Messages above the list and the preview. */
	before?: () => unknown;
	/** Messages below the list and the preview. */
	after?: () => unknown;
}>();

const i18n = useI18n();
const sidebarWidth = ref(320);
const previewRef = ref<HTMLElement | null>(null);
/** The groups that the user folded. */
const collapsed = ref(new Set<string>());

watch(previewId, () => {
	if (previewRef.value) previewRef.value.scrollTop = 0;
});

/** The list is single-select: the selected row is the skill in the preview. */
function onPreview(value: unknown) {
	if (typeof value === 'string') previewId.value = value;
}

const DECISION_LABELS = {
	accept: 'settings.context.skills.review.decision.accept',
	reject: 'settings.context.skills.review.decision.reject',
} satisfies Record<SkillDecision, BaseTextKey>;

function decisionItems(current: SkillDecision | null): Array<DropdownMenuItemProps<SkillDecision>> {
	return (['accept', 'reject'] as const).map((decision) => ({
		id: decision,
		label: i18n.baseText(DECISION_LABELS[decision]),
		checked: current === decision,
	}));
}

function decisionOf(item: SkillReviewItem): SkillDecision {
	return decisions.value[item.id] ?? 'accept';
}

function decide(ids: string[], decision: SkillDecision) {
	decisions.value = {
		...decisions.value,
		...Object.fromEntries(ids.map((id) => [id, decision])),
	};
}

function decidableIds(group: SkillReviewGroup): string[] {
	return group.items.filter((item) => item.decidable).map((item) => item.id);
}

/** The decision of every skill in the group, or `null` when the skills differ. */
function groupDecision(group: SkillReviewGroup): SkillDecision | null {
	const values = new Set(
		group.items.filter((item) => item.decidable).map((item) => decisionOf(item)),
	);
	return values.size === 1 ? [...values][0] : null;
}

function decisionLabel(decision: SkillDecision | null): string {
	return decision
		? i18n.baseText(DECISION_LABELS[decision])
		: i18n.baseText('settings.context.skills.review.decision.mixed');
}

/** "Other skills" has no group id, so it gets its own key. */
function groupKey(group: SkillReviewGroup): string {
	return group.id || '__other__';
}

function isCollapsed(group: SkillReviewGroup): boolean {
	return collapsed.value.has(groupKey(group));
}

function toggleCollapse(group: SkillReviewGroup) {
	const next = new Set(collapsed.value);
	if (!next.delete(groupKey(group))) next.add(groupKey(group));
	collapsed.value = next;
}

/**
 * The icon repeats the colour, so the status does not rely on colour alone. A skill that cannot
 * come in gets a yellow "no entry" sign, not red: red is for the removed lines of the diff.
 */
const STATUS_ICONS = {
	error: { icon: 'circle-minus', color: 'warning' },
	warning: { icon: 'triangle-alert', color: 'warning' },
	info: { icon: 'circle-alert', color: 'text-base' },
	success: { icon: 'circle-check', color: 'success' },
} satisfies Record<SkillStatusKind, { icon: IconName; color: IconColor }>;

const STATUS_LABELS = {
	error: 'settings.context.skills.connect.status.error',
	warning: 'settings.context.skills.connect.status.warning',
	info: 'settings.context.skills.connect.status.info',
	success: 'settings.context.skills.connect.status.success',
} satisfies Record<SkillStatusKind, BaseTextKey>;

function statusLabel(kind: SkillStatusKind, count: number): string {
	return i18n.baseText(STATUS_LABELS[kind], { interpolate: { count }, adjustToNumber: count });
}

const hasItems = () => props.groups.some((group) => group.items.length > 0);
</script>

<template>
	<N8nDialogBody :class="$style.body">
		<div v-if="$slots.before" :class="$style.notes"><slot name="before" /></div>
		<div :class="$style.picker">
			<N8nModalSidebar
				v-model:width="sidebarWidth"
				:label="i18n.baseText('settings.context.skills.review.listLabel')"
				:min-width="240"
				:max-width="480"
			>
				<div :class="$style.sidebarList">
					<div v-if="!hasItems()" :class="$style.empty" data-test-id="skill-review-empty">
						<slot name="empty" />
					</div>
					<N8nListbox
						v-else
						:model-value="previewId"
						variant="flush"
						size="small"
						max-height="none"
						:aria-label="i18n.baseText('settings.context.skills.review.listLabel')"
						:class="$style.listbox"
						data-test-id="skill-review-list"
						@update:model-value="onPreview"
					>
						<template v-for="group in groups" :key="groupKey(group)">
							<div v-if="group.name" :class="$style.groupHeader" data-test-id="skill-review-group">
								<button
									type="button"
									:class="$style.groupToggle"
									:aria-expanded="!isCollapsed(group)"
									data-test-id="skill-review-group-toggle"
									@click="toggleCollapse(group)"
									@keydown.stop
								>
									<N8nIcon icon="folder" color="text-light" size="small" />
									<N8nText tag="span" size="small" color="text-light" :class="$style.ellipsis">
										{{ group.name }}
									</N8nText>
									<N8nIcon
										:icon="isCollapsed(group) ? 'chevron-right' : 'chevron-down'"
										color="text-light"
										size="small"
									/>
								</button>
								<!-- One menu decides every skill of the group. -->
								<span
									v-if="canDecide && decidableIds(group).length > 0"
									:class="$style.decision"
									@click.stop
									@pointerdown.stop
									@keydown.stop
								>
									<N8nDropdownMenu
										:items="decisionItems(groupDecision(group))"
										placement="bottom-end"
										data-test-id="skill-review-group-decision"
										@select="decide(decidableIds(group), $event)"
									>
										<template #trigger>
											<N8nButton
												variant="ghost"
												size="xsmall"
												:aria-label="
													i18n.baseText('settings.context.skills.review.decision.label', {
														interpolate: { name: group.name },
													})
												"
											>
												{{ decisionLabel(groupDecision(group)) }}
												<N8nIcon icon="chevron-down" size="small" />
											</N8nButton>
										</template>
									</N8nDropdownMenu>
								</span>
							</div>
							<template v-if="!isCollapsed(group)">
								<N8nListboxItem
									v-for="item in group.items"
									:key="item.id"
									:value="item.id"
									:label="item.title"
									:data-test-id="`skill-review-item-${item.id}`"
								>
									<div :class="[$style.item, !item.decidable && $style.undecidable]">
										<div :class="$style.itemText">
											<N8nText bold size="small" :class="$style.ellipsis">{{ item.title }}</N8nText>
											<N8nText
												v-if="item.subtitle"
												size="xsmall"
												color="text-light"
												:class="$style.clamp"
											>
												{{ item.subtitle }}
											</N8nText>
											<N8nText
												v-if="item.reason"
												size="xsmall"
												color="danger"
												data-test-id="skill-review-item-reason"
											>
												{{ item.reason }}
											</N8nText>
										</div>
										<span :class="$style.statuses" data-test-id="skill-review-item-status">
											<span
												v-for="status in item.statuses"
												:key="status.kind"
												:class="$style.status"
												role="img"
												:aria-label="statusLabel(status.kind, status.count)"
												:title="statusLabel(status.kind, status.count)"
											>
												<N8nIcon
													:icon="STATUS_ICONS[status.kind].icon"
													:color="STATUS_ICONS[status.kind].color"
													size="small"
												/>
												<N8nText
													v-if="status.count > 1"
													size="xsmall"
													:color="STATUS_ICONS[status.kind].color"
													aria-hidden="true"
												>
													{{ status.count }}
												</N8nText>
											</span>
										</span>
										<!-- The menu decides the skill. The rest of the row only previews it, so the
										     menu keeps its events away from the option. -->
										<span
											v-if="canDecide && item.decidable"
											:class="$style.decision"
											@click.stop
											@pointerdown.stop
											@keydown.stop
										>
											<N8nDropdownMenu
												:items="decisionItems(decisionOf(item))"
												placement="bottom-end"
												data-test-id="skill-review-decision"
												@select="decide([item.id], $event)"
											>
												<template #trigger>
													<N8nButton
														variant="outline"
														size="xsmall"
														:aria-label="
															i18n.baseText('settings.context.skills.review.decision.label', {
																interpolate: { name: item.title },
															})
														"
														data-test-id="skill-review-decision-trigger"
													>
														{{ decisionLabel(decisionOf(item)) }}
														<N8nIcon icon="chevron-down" size="small" />
													</N8nButton>
												</template>
											</N8nDropdownMenu>
										</span>
									</div>
								</N8nListboxItem>
							</template>
						</template>
					</N8nListbox>
				</div>
			</N8nModalSidebar>

			<section ref="previewRef" :class="$style.preview" data-test-id="skill-review-preview">
				<slot />
			</section>
		</div>
		<div v-if="$slots.after" :class="$style.notes"><slot name="after" /></div>
	</N8nDialogBody>
</template>

<style lang="scss" module>
/* The list and the preview fill the body edge to edge, as in the modal sidebar pattern.
   No negative margin, so the body does not cover the header border and the active tab line.
   The class is doubled so it wins over the dialog body padding. */
.body.body {
	padding: 0;
	margin-block: 0;
	gap: 0;
	overflow: hidden;
	border-bottom: var(--border);
}

/* Messages around the picker keep the dialog padding. With no message, the box goes. */
.notes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--n8n-dialog-region--padding, var(--spacing--md));

	&:empty {
		display: none;
	}

	&:not(:empty) + .picker,
	.picker + &:not(:empty) {
		border-top: var(--border);
	}
}

.picker {
	display: flex;
	height: min(65vh, 44rem);
	min-height: 0;
	overflow: hidden;
}

/* The flush highlight bleeds by 12px, so the list pads twice that. See N8nModalSidebar. */
.sidebarList {
	padding-block: var(--spacing--xs);
	padding-inline: calc(var(--spacing--xs) + var(--spacing--xs));
}

.empty {
	padding-block: var(--spacing--2xs);
}

.listbox {
	width: 100%;
	--listbox-flush-highlight-inset-inline: var(--spacing--xs);
	--listbox-flush-highlight-inset-block: 0px;
	--listbox-flush-gap: var(--spacing--5xs);
	--listbox-row-min-height: var(--spacing--xl);
	/* Two lines of text, so the row has more room than a menu item. */
	--listbox-row-padding-block: var(--spacing--2xs);
}

.groupHeader {
	position: sticky;
	top: 0;
	z-index: 2;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	background-color: var(--color--background--light-2);

	/* A second group starts with space above, so the groups read apart. */
	&:not(:first-child) {
		margin-top: var(--spacing--xs);
	}
}

.groupToggle {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	padding: 0;
	border: 0;
	background: transparent;
	font: inherit;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}

.undecidable .itemText {
	opacity: 0.7;
}

.itemText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.statuses {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--3xs);
}

.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.decision {
	display: flex;
	flex-shrink: 0;
}

.ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.clamp {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.preview {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	min-height: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
	/* The space of the scrollbar stays free, so the content does not move when it appears. */
	scrollbar-gutter: stable;
	background-color: var(--background--surface);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}
</style>
