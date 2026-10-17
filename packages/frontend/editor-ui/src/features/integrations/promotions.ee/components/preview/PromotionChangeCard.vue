<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nLink, N8nLoading, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';

import type { DetailEntry } from '../../composables/usePromotionResourceDetails';
import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import {
	describeDataTable,
	describeFieldChanges,
	hasUnreadableSide,
	isStaleDetail,
	sideState,
	type DetailSide,
} from '../../promotionPreview.content';
import type { ResourceKey, SelectionGraph } from '../../promotionPreview.selection';
import { isContainer, resourceIcon } from '../../promotionPreview.tree';
import DataTableChangeDetails from './DataTableChangeDetails.vue';
import PromotionFieldChanges from './PromotionFieldChanges.vue';

const props = defineProps<{
	resource: PromotionResource;
	graph: SelectionGraph;
	direction: PromotionDirection;
	included: boolean;
	entry?: DetailEntry;
	inspected: boolean;
}>();

const emit = defineEmits<{
	inspect: [key: ResourceKey];
	retry: [];
	refresh: [];
}>();

const i18n = useI18n();
const nameOf = (key: string) => props.graph.resources.get(key)?.name ?? key;
const { changeLabel } = usePromotionPreviewLabels();

// Cards start open. Inspecting a resource from the tree opens its card again.
const open = ref(true);
watch(
	() => props.inspected,
	(inspected) => {
		if (inspected) open.value = true;
	},
);
const statusLabel = computed(() =>
	i18n.baseText(
		props.included ? 'promotions.preview.card.included' : 'promotions.preview.card.notIncluded',
	),
);

// On a project page, project scope is the default, so only global variables say so.
const scope = computed(() =>
	props.resource.key.startsWith('variable:global:')
		? i18n.baseText('promotions.preview.card.globalScope')
		: undefined,
);

type Footer = { keypath: BaseTextKey; resourceKeys: readonly ResourceKey[] };

// Resources that users cannot select name the workflows that use or call them.
const footer = computed((): Footer | undefined => {
	const { resource, graph } = props;
	if (resource.selectable || isContainer(resource)) return undefined;
	const users = graph.requiredBy.get(resource.key) ?? [];
	if (users.length > 0) return { keypath: 'promotions.preview.card.usedBy', resourceKeys: users };
	return {
		keypath: 'promotions.preview.card.calledBy',
		resourceKeys: graph.calledBy.get(resource.key) ?? [],
	};
});

const detail = computed(() => (props.entry?.status === 'loaded' ? props.entry.detail : undefined));
const stale = computed(() => !!detail.value && isStaleDetail(detail.value, props.resource));
const fieldChanges = computed(() =>
	detail.value
		? describeFieldChanges(detail.value, {
				direction: props.direction,
				resource: props.resource,
				containerName: nameOf,
			})
		: [],
);
const dataTable = computed(() =>
	detail.value?.type === 'dataTable' ? describeDataTable(detail.value, props.resource) : undefined,
);
const absentSides = computed((): DetailSide[] => {
	const current = detail.value;
	if (!current) return [];
	return (['before', 'after'] as const).filter(
		(side) => sideState(current, side).kind === 'absent',
	);
});
const isApplyMove = computed(
	() =>
		props.direction === 'apply' &&
		props.resource.type === 'folder' &&
		props.resource.previousParentKey !== undefined,
);
</script>

<template>
	<CollapsibleRoot v-model:open="open" as-child>
		<article
			:class="[$style.card, { [$style.inspected]: inspected }]"
			data-test-id="promotion-preview-card"
			:data-resource-key="resource.key"
		>
			<CollapsibleTrigger :class="$style.header" data-test-id="promotion-preview-card-toggle">
				<N8nIcon :icon="resourceIcon(resource.type)" size="small" :class="$style.icon" />
				<N8nText bold size="medium" :class="$style.title">{{ resource.name }}</N8nText>
				<N8nText v-if="changeLabel(resource)" step="xs" color="text-light">
					{{ changeLabel(resource) }}
				</N8nText>
				<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
				<N8nTooltip :content="statusLabel" as-child>
					<span
						role="img"
						:aria-label="statusLabel"
						:class="[$style.status, { [$style.included]: included }]"
						data-test-id="promotion-preview-card-status"
						:data-included="included"
					>
						<N8nIcon :icon="included ? 'circle-check' : 'circle-minus'" size="medium" />
					</span>
				</N8nTooltip>
			</CollapsibleTrigger>

			<CollapsibleContent>
				<div :class="$style.notices">
					<N8nCallout v-if="entry?.status === 'missing'" theme="warning" slim>
						{{ i18n.baseText('promotions.preview.card.missing') }}
						<template #trailingContent>
							<N8nLink size="small" @click="emit('refresh')">
								{{ i18n.baseText('promotions.preview.refresh') }}
							</N8nLink>
						</template>
					</N8nCallout>
					<N8nCallout v-else-if="entry?.status === 'error'" theme="danger" slim>
						{{ i18n.baseText('promotions.preview.card.loadFailed') }}
						<template #trailingContent>
							<N8nLink size="small" @click="emit('retry')">
								{{ i18n.baseText('promotions.preview.state.retry') }}
							</N8nLink>
						</template>
					</N8nCallout>
					<N8nCallout v-if="stale" theme="warning" slim data-test-id="promotion-preview-card-stale">
						{{ i18n.baseText('promotions.preview.card.stale') }}
						<template #trailingContent>
							<N8nLink size="small" @click="emit('refresh')">
								{{ i18n.baseText('promotions.preview.refresh') }}
							</N8nLink>
						</template>
					</N8nCallout>
					<N8nCallout v-if="detail && hasUnreadableSide(detail)" theme="info" slim>
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
				<N8nLoading v-else-if="entry?.status === 'loading'" :rows="2" :class="$style.padded" />
				<template v-else-if="detail">
					<DataTableChangeDetails
						v-if="dataTable"
						:class="$style.padded"
						:description="dataTable"
						:direction="direction"
					/>
					<PromotionFieldChanges
						v-else-if="fieldChanges.length > 0"
						:changes="fieldChanges"
						:direction="direction"
						:absent-sides="absentSides"
					/>
					<N8nText
						v-if="detail.type === 'variable' && detail.valueHidden"
						step="2xs"
						color="text-light"
						:class="$style.padded"
					>
						{{ i18n.baseText('promotions.preview.variable.valueHidden') }}
					</N8nText>
					<N8nText v-if="isApplyMove" step="2xs" color="text-light" :class="$style.padded">
						{{ i18n.baseText('promotions.preview.folder.moveConflict') }}
					</N8nText>
				</template>

				<footer v-if="footer" :class="$style.footer">
					<N8nText v-if="scope" step="2xs" color="text-light">{{ scope }}</N8nText>
					<N8nText step="2xs" color="text-light" data-test-id="promotion-preview-card-inclusion">
						<I18nT :keypath="footer.keypath" scope="global">
							<template #names>
								<template v-for="(key, index) in footer.resourceKeys" :key="key">
									<template v-if="index > 0">, </template>
									<button
										type="button"
										:class="$style.nameLink"
										data-test-id="promotion-preview-card-relation"
										@click="emit('inspect', key)"
									>
										{{ nameOf(key) }}
									</button>
								</template>
							</template>
						</I18nT>
					</N8nText>
				</footer>
			</CollapsibleContent>
		</article>
	</CollapsibleRoot>
</template>

<style module lang="scss">
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
	width: 100%;
	min-height: var(--height--xl);
	padding: 0 var(--spacing--sm);
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;

	&[data-state='open'] {
		border-bottom: var(--border);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.chevron {
	flex-shrink: 0;
	color: var(--icon-color);
	transition: transform var(--duration--snappy) var(--easing--ease-out);

	[data-state='closed'] > & {
		transform: rotate(-90deg);
	}
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
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
	content: '·';
	margin-right: var(--spacing--2xs);
}

/* N8nLink has no light theme, so the names use the footer text color. */
.nameLink {
	padding: 0;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	text-decoration: underline;
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
}

.status {
	display: flex;
	margin-left: auto;
	color: var(--icon-color);
}

.included {
	color: var(--icon-color--success);
}
</style>
