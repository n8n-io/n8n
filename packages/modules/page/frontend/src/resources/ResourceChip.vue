<script setup lang="ts">
import { parseResourcePath } from '@n8n/api-types';
import { N8nHoverCard, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, inject, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { usePageResourceStore } from './resource.store';
import { toResourceDisplay } from './resourceDisplay';
import ResourceIcon from './ResourceIcon.vue';
import ResourcePreviewCard from './ResourcePreviewCard.vue';
import { CATEGORY_ICONS } from '../overview/overviewDisplay';
import { WORKFLOW_CATEGORIES } from '../overview/workflowCategories';
import { RESOURCE_PREVIEW_DELAY_MS } from '../page.constants';

const props = defineProps<{
	/** The instance-relative editor path of the resource, for example `/workflow/abc123`. */
	href: string;
	/** The text to show while the name loads and when the resource is missing. */
	label?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const resourceStore = usePageResourceStore();

const reference = computed(() => parseResourcePath(props.href));

const resolution = computed(() =>
	reference.value ? resourceStore.resolutionOf(reference.value) : undefined,
);

const workflowCategories = inject(WORKFLOW_CATEGORIES, undefined);

/** The trigger category of the workflow of the chip, when an ancestor provides the categories. */
const category = computed(() =>
	reference.value?.resourceType === 'workflow'
		? workflowCategories?.value.get(reference.value.resourceId)
		: undefined,
);

const isMissing = computed(() => resolution.value?.status === 'missing');

/** What the preview shows. A resource that is loading or missing has no preview. */
const details = computed(() =>
	resolution.value?.status === 'found' ? resolution.value : undefined,
);

const isPreviewOpen = ref(false);

const display = computed(() =>
	toResourceDisplay(
		reference.value?.resourceType,
		details.value?.name ?? props.label ?? props.href,
	),
);

/** The address with the base path of the instance, so that the browser can open it in a new tab. */
const address = computed(() => router.resolve(props.href).href);

watchEffect(() => {
	if (reference.value) {
		void resourceStore.resolveName(reference.value);
	}
});

function opensNewTab(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey;
}

/** Opens the resource in the app. A modified click keeps the browser behavior. */
function openResource(event: MouseEvent) {
	if (!opensNewTab(event)) {
		event.preventDefault();
		void router.push(props.href);
	}
}
</script>

<template>
	<N8nTooltip :disabled="!isMissing" :content="i18n.baseText('page.resource.missing')">
		<N8nHoverCard
			v-model:open="isPreviewOpen"
			:disabled="details === undefined"
			:open-delay="RESOURCE_PREVIEW_DELAY_MS"
			side="top"
			align="start"
		>
			<template #trigger>
				<a
					:href="address"
					:class="[
						'not-prose',
						$style.chip,
						isMissing ? $style.missing : '',
						category ? [$style.accented, $style[category]] : '',
					]"
					:data-resource-type="reference?.resourceType"
					:data-trigger-category="category"
					data-test-id="page-resource-chip"
					@click="openResource"
				>
					<ResourceIcon
						:icon="category ? CATEGORY_ICONS[category] : display.icon"
						:emoji="category ? undefined : display.emoji"
						:node-type="details?.nodeType"
						:class="$style.icon"
					/>
					<span :class="$style.name">{{ display.text }}</span>
				</a>
			</template>
			<template #content>
				<ResourcePreviewCard
					v-if="reference && details"
					:resource-type="reference.resourceType"
					:details="details"
					:address="address"
					@open="openResource"
				/>
			</template>
		</N8nHoverCard>
	</N8nTooltip>
</template>

<style lang="scss" module>
@use '../overview/accent';

@include accent.classes;

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	// The markdown editor gives block margins to every link. A chip is inline.
	margin: 0 !important;
	padding: 0 var(--spacing--3xs);
	border-radius: var(--radius--xs);
	background-color: var(--background--subtle);
	border: var(--border);
	border-color: var(--border-color--subtle);
	color: var(--text-color);
	font-size: 0.925em;
	font-weight: var(--font-weight--medium);
	line-height: 1.45;
	text-decoration: none;
	vertical-align: baseline;
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--background--hover);
		color: var(--text-color);
		text-decoration: none;
	}
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.accented {
	border-color: transparent;
	background-color: var(--page-overview--accent--color--background);
	color: var(--page-overview--accent--color--text);
	transition: filter var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--page-overview--accent--color--background);
		color: var(--page-overview--accent--color--text);
		filter: brightness(0.95) saturate(1.3);
	}

	.icon {
		color: inherit;
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.missing {
	color: var(--text-color--subtler);
	font-weight: var(--font-weight--regular);

	.name {
		text-decoration: line-through;
	}

	.icon {
		color: var(--text-color--subtler);
	}
}
</style>
