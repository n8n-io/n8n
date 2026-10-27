<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import {
	CollapsibleContent,
	CollapsibleRoot,
	CollapsibleTrigger,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nIcon,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, watch } from 'vue';
import { I18nT } from 'vue-i18n';

import type { DetailEntry } from '../../composables/usePromotionResourceDetails';
import type { Blocker } from '../../promotionOperation';
import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import {
	describeDataTable,
	describeFieldChanges,
	describeWorkflowFieldChanges,
	hasUnreadableSide,
	isStaleDetail,
	sideState,
	type DetailSide,
} from '../../promotionPreview.content';
import type { ResourceKey, SelectionCheck, SelectionGraph } from '../../promotionPreview.selection';
import { isContainer, resourceIcon } from '../../promotionPreview.tree';
import { hasWorkflowDiff } from '../../promotionPreview.workflow';
import DataTableChangeDetails from './DataTableChangeDetails.vue';
import PromotionFieldChanges from './PromotionFieldChanges.vue';
import PromotionWorkflowPreview from './PromotionWorkflowPreview.vue';
import PromotionWorkflowLinks from './PromotionWorkflowLinks.vue';

const props = withDefaults(
	defineProps<{
		resource: PromotionResource;
		graph: SelectionGraph;
		direction: PromotionDirection;
		selection: SelectionCheck;
		entry?: DetailEntry;
		inspected: boolean;
		blockers?: Blocker[];
		diffActive?: boolean;
		/** False for a list that users only read. */
		selectable?: boolean;
	}>(),
	{ selectable: true },
);

const emit = defineEmits<{
	inspect: [key: ResourceKey];
	toggle: [];
	retry: [];
	refresh: [];
	activateDiff: [];
	deactivateDiff: [];
}>();

const i18n = useI18n();
const nameOf = (key: string) => props.graph.resources.get(key)?.name ?? key;
const { changeLabel, blockerMessage, selectLabel } = usePromotionPreviewLabels();
const blocker = computed(() => blockerMessage(props.resource, props.blockers));

// Cards start open. Inspecting a resource from the tree opens its card again.
const open = defineModel<boolean>('open', { default: true });
watch(
	() => props.inspected,
	(inspected) => {
		if (inspected) open.value = true;
	},
);
watch(open, (isOpen) => {
	if (!isOpen && props.diffActive) emit('deactivateDiff');
});
// On a project page, project scope is the default, so only global variables say so.
const scope = computed(() =>
	props.resource.key.startsWith('variable:global:')
		? i18n.baseText('promotions.preview.card.globalScope')
		: undefined,
);

type Footer = { keypath: BaseTextKey; workflows: Array<{ key: ResourceKey; name: string }> };

// Resources that users cannot select name the workflows that use or call them. A resource
// that a review deletes can have no such workflow left.
const footer = computed((): Footer | undefined => {
	const { resource, graph } = props;
	if (resource.selectable || isContainer(resource)) return undefined;
	const users = graph.requiredBy.get(resource.key) ?? [];
	const callers = graph.calledBy.get(resource.key) ?? [];
	const named = (keys: readonly ResourceKey[]) => keys.map((key) => ({ key, name: nameOf(key) }));
	if (users.length > 0)
		return { keypath: 'promotions.preview.card.usedBy', workflows: named(users) };
	if (callers.length > 0)
		return { keypath: 'promotions.preview.card.calledBy', workflows: named(callers) };
	return undefined;
});

const detail = computed(() => (props.entry?.status === 'loaded' ? props.entry.detail : undefined));
const hasDiff = computed(() => hasWorkflowDiff(props.resource));
const stale = computed(() => !!detail.value && isStaleDetail(detail.value, props.resource));
const fieldChanges = computed(() => {
	const context = { direction: props.direction, resource: props.resource, containerName: nameOf };
	if (props.resource.type === 'workflow') return describeWorkflowFieldChanges(context);
	return detail.value ? describeFieldChanges(detail.value, context) : [];
});
const dataTable = computed(() =>
	detail.value?.type === 'dataTable'
		? describeDataTable(detail.value, props.resource, props.direction)
		: undefined,
);
const absentSides = computed((): DetailSide[] => {
	const current = detail.value;
	if (!current) return [];
	return (['before', 'after'] as const).filter(
		(side) => sideState(current, side).kind === 'absent',
	);
});
// Tags belong to the whole instance, so Apply changes them outside this project too.
const tagNote = computed(() => {
	const { direction, resource } = props;
	if (direction !== 'apply' || resource.type !== 'tag' || resource.change !== 'modified') {
		return undefined;
	}
	if (resource.previousId !== undefined) return i18n.baseText('promotions.preview.tag.linked');
	if (resource.previousName !== undefined) return i18n.baseText('promotions.preview.tag.renamed');
	return undefined;
});
</script>

<template>
	<CollapsibleRoot v-model:open="open" as-child>
		<article
			:class="[$style.card, { [$style.inspected]: inspected }]"
			data-test-id="promotion-preview-card"
			:data-resource-key="resource.key"
		>
			<div :class="$style.header">
				<!-- A sibling of the trigger, as a checkbox cannot sit inside a button. -->
				<N8nCheckbox
					v-if="selectable"
					:model-value="selection.checked"
					:indeterminate="selection.indeterminate"
					:disabled="selection.disabled"
					:aria-label="selectLabel(resource)"
					data-test-id="promotion-preview-card-checkbox"
					@update:model-value="emit('toggle')"
				/>
				<CollapsibleTrigger :class="$style.trigger" data-test-id="promotion-preview-card-toggle">
					<N8nIcon :icon="resourceIcon(resource.type)" size="small" :class="$style.icon" />
					<span :class="$style.heading">
						<N8nText
							bold
							size="medium"
							color="text-dark"
							:title="resource.name"
							:class="$style.title"
						>
							{{ resource.name }}
						</N8nText>
						<N8nText v-if="changeLabel(resource, direction)" step="xs" color="text-light">
							{{ changeLabel(resource, direction) }}
						</N8nText>
					</span>
					<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					<N8nTooltip v-if="blocker" as-child>
						<!-- Plain text: a personal project name such as `Name <email>` is not HTML. -->
						<template #content>{{ blocker }}</template>
						<span
							role="img"
							:aria-label="blocker"
							:class="$style.blocker"
							data-test-id="promotion-preview-card-blocker"
						>
							<N8nIcon icon="circle-alert" size="medium" color="--icon-color--warning" />
						</span>
					</N8nTooltip>
				</CollapsibleTrigger>
			</div>

			<CollapsibleContent>
				<div :class="$style.notices">
					<!-- A workflow diff shows these states in its own area. -->
					<template v-if="!hasDiff">
						<N8nCallout v-if="entry?.status === 'missing'" theme="warning" slim>
							{{ i18n.baseText('promotions.preview.card.missing') }}
							<template #trailingContent>
								<N8nButton variant="outline" size="small" @click="emit('refresh')">
									{{ i18n.baseText('promotions.preview.refresh') }}
								</N8nButton>
							</template>
						</N8nCallout>
						<N8nCallout v-else-if="entry?.status === 'error'" theme="danger" slim>
							{{ i18n.baseText('promotions.preview.card.loadFailed') }}
							<template #trailingContent>
								<N8nButton variant="outline" size="small" @click="emit('retry')">
									{{ i18n.baseText('promotions.preview.state.retry') }}
								</N8nButton>
							</template>
						</N8nCallout>
					</template>
					<N8nCallout v-if="stale" theme="warning" slim data-test-id="promotion-preview-card-stale">
						{{ i18n.baseText('promotions.preview.card.stale') }}
						<template #trailingContent>
							<N8nButton variant="outline" size="small" @click="emit('refresh')">
								{{ i18n.baseText('promotions.preview.refresh') }}
							</N8nButton>
						</template>
					</N8nCallout>
					<N8nCallout v-if="!hasDiff && detail && hasUnreadableSide(detail)" theme="info" slim>
						{{ i18n.baseText('promotions.preview.card.unreadable') }}
					</N8nCallout>
				</div>

				<N8nText
					v-if="resource.change === 'unchanged'"
					step="xs"
					color="text-light"
					:class="$style.padded"
				>
					{{ i18n.baseText('promotions.preview.card.noChanges') }}
				</N8nText>
				<N8nLoading
					v-else-if="entry?.status === 'loading' && !hasDiff"
					:rows="2"
					:class="$style.padded"
				/>
				<template v-else>
					<DataTableChangeDetails
						v-if="dataTable"
						:class="$style.padded"
						:description="dataTable"
					/>
					<PromotionFieldChanges
						v-else-if="fieldChanges.length > 0"
						:changes="fieldChanges"
						:direction="direction"
						:absent-sides="absentSides"
					/>
					<PromotionWorkflowPreview
						v-if="hasDiff"
						:active="!!diffActive && open"
						:entry="entry"
						:resource-key="resource.key"
						:workflow-name="resource.name"
						:direction="direction"
						:graph="graph"
						@activate="emit('activateDiff')"
						@retry="emit('retry')"
						@refresh="emit('refresh')"
					/>
					<N8nText
						v-if="detail?.type === 'variable' && detail.valueHidden"
						step="2xs"
						color="text-light"
						:class="$style.padded"
					>
						{{ i18n.baseText('promotions.preview.variable.valueHidden') }}
					</N8nText>
					<N8nText v-if="tagNote" step="2xs" color="text-light" :class="$style.padded">
						{{ tagNote }}
					</N8nText>
				</template>

				<footer v-if="footer || scope" :class="$style.footer">
					<N8nText v-if="scope" step="2xs" color="text-light">{{ scope }}</N8nText>
					<N8nText
						v-if="footer"
						step="2xs"
						color="text-light"
						data-test-id="promotion-preview-card-inclusion"
					>
						<I18nT :keypath="footer.keypath" scope="global">
							<template #names>
								<PromotionWorkflowLinks
									:workflows="footer.workflows"
									@inspect="emit('inspect', $event)"
								/>
							</template>
						</I18nT>
					</N8nText>
				</footer>
			</CollapsibleContent>
		</article>
	</CollapsibleRoot>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.card {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	/* The gap between cards, so the card above stays out of view. */
	scroll-margin-top: var(--spacing--xs);
	overflow: hidden;
}

.inspected {
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

.trigger {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	align-self: stretch;
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

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.heading {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.notices {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm) 0;

	&:empty {
		display: none;
	}
}

.padded {
	/* N8nText renders a span, which ignores vertical padding. */
	display: block;
	padding: var(--spacing--xs) var(--spacing--sm);
}

.footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	column-gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border);
}

.footer > * + *::before {
	content: '·' / '';
	margin-right: var(--spacing--2xs);
}

.blocker {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	margin-left: auto;
}
</style>
