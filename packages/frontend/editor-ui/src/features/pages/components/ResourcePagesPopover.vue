<script setup lang="ts">
import type { PageSummary } from '@n8n/api-types';
import { getPagePermissions } from '@n8n/frontend-module-page';
import { N8nButton, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { useStyles } from '@n8n/composables/useStyles';

import { usePageCreation } from '../composables/usePageCreation';
import { hasNewTabIntent } from '../composables/usePageOpening';
import { usePagePeekStore } from '../pagePeek.store';
import { toPageRoute } from '../pageRoute';
import { toResourcePagesTextKeys, type PagesResource } from '../resourcePages';

/**
 * Lists the pages that link to a resource in a popover that opens from the `trigger` slot.
 * A click on a page shows it in the side panel, so the user stays on the resource.
 * The popover also creates a page that links to the resource, in `projectId`, and shows it the same way.
 * Emits `navigate` when an action of the `actions` slot leaves the view.
 */
const props = withDefaults(
	defineProps<{
		pages: PageSummary[];
		resource: PagesResource;
		/** The title of a new page, and the text of its link to the resource. */
		resourceName: string;
		/** The project that gets a new page. Without it the popover offers no creation. */
		projectId?: string;
		/** The start of each test id, for example `workflow-pages`. */
		testIdPrefix: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
	}>(),
	{ projectId: undefined, side: 'bottom', align: 'start' },
);

const emit = defineEmits<{
	navigate: [];
}>();

const isOpen = defineModel<boolean>('open', { default: false });

const i18n = useI18n();
const router = useRouter();
const { APP_Z_INDEXES } = useStyles();
const { isCreating, createPageLinkingResource } = usePageCreation();
const peekStore = usePagePeekStore();

const textKeys = computed(() => toResourcePagesTextKeys(props.resource.resourceType));
const hasPages = computed(() => props.pages.length > 0);

const canCreatePage = computed(
	() => props.projectId !== undefined && getPagePermissions(props.projectId).canCreate,
);

function closeBeforeNavigation(): void {
	isOpen.value = false;
	emit('navigate');
}

function hrefOf(pageId: string): string {
	return router.resolve(toPageRoute(pageId)).href;
}

function peekPage(pageId: string): void {
	isOpen.value = false;
	peekStore.open(pageId);
}

/** A plain click shows the page in the side panel. A click with a modifier key opens a new tab. */
function peekPageOnPlainClick(event: MouseEvent, pageId: string): void {
	if (!hasNewTabIntent(event)) {
		event.preventDefault();
		peekPage(pageId);
	}
}

async function createPageAndPeekIt(): Promise<void> {
	if (props.projectId !== undefined) {
		const page = await createPageLinkingResource(
			props.projectId,
			props.resource,
			props.resourceName,
		);
		if (page !== undefined) {
			peekPage(page.id);
		}
	}
}
</script>

<template>
	<N8nPopover
		v-model:open="isOpen"
		:side="side"
		:align="align"
		:enable-scrolling="false"
		:z-index="APP_Z_INDEXES.FLOATING_UI"
		:content-class="$style.popover"
	>
		<template #trigger>
			<slot name="trigger" />
		</template>
		<template #content>
			<div :class="$style.content" :data-test-id="`${testIdPrefix}-popover`">
				<N8nText tag="h3" size="small" :bold="true" :class="$style.heading">
					{{ i18n.baseText('page.pages') }}
				</N8nText>
				<ul v-if="hasPages" :class="$style.list">
					<li v-for="page in pages" :key="page.id">
						<a
							:href="hrefOf(page.id)"
							:class="$style.item"
							:data-test-id="`${testIdPrefix}-item`"
							@click="peekPageOnPlainClick($event, page.id)"
						>
							<N8nIcon icon="file-text" size="small" :class="$style.itemIcon" />
							<span :class="$style.itemTitle">{{ page.title }}</span>
							<span :class="$style.itemTime"><TimeAgo :date="page.updatedAt" /></span>
						</a>
					</li>
				</ul>
				<N8nText
					v-else
					tag="p"
					size="small"
					color="text-light"
					:class="$style.empty"
					:data-test-id="`${testIdPrefix}-empty`"
				>
					{{ i18n.baseText(textKeys.emptyList) }}
				</N8nText>
				<div v-if="canCreatePage" :class="$style.footer">
					<N8nButton
						variant="ghost"
						size="small"
						icon="plus"
						:label="i18n.baseText(textKeys.createPage)"
						:loading="isCreating"
						:class="$style.createButton"
						:data-test-id="`${testIdPrefix}-create`"
						@click="createPageAndPeekIt"
					/>
					<div :class="$style.extraActions">
						<slot name="actions" :close="closeBeforeNavigation" />
					</div>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover {
	width: calc(var(--spacing--5xl) * 1.25);
	max-width: calc(100vw - var(--spacing--lg));
}

.content {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs);
}

.heading {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-height: calc(var(--spacing--5xl) * 1.25);
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	scrollbar-width: thin;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	text-decoration: none;

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
		outline: none;
	}
}

.itemIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.itemTitle {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemTime {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.empty {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--2xs);
	line-height: var(--line-height--lg);
}

.footer {
	margin-top: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.createButton {
	width: 100%;
	justify-content: start;
}

.extraActions {
	display: flex;
	flex-direction: column;

	:deep(button) {
		width: 100%;
		justify-content: start;
	}
}
</style>
