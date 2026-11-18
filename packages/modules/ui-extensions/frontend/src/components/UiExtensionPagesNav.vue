<script setup lang="ts">
import { N8nIcon, N8nMenuItem, type IMenuItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useRemoveUiExtension } from '../composables/useRemoveUiExtension';
import { UI_EXTENSION_PAGE_VIEW } from '../ui-extensions.constants';
import { useSidePanelStore } from '../ui-extensions.store';
import type { SidePanelView } from '../ui-extensions.types';

const props = defineProps<{ collapsed: boolean }>();

const i18n = useI18n();
const route = useRoute();
const store = useSidePanelStore();
const { remove } = useRemoveUiExtension();

const activePageId = computed(() =>
	route.name === UI_EXTENSION_PAGE_VIEW && typeof route.params.pageId === 'string'
		? route.params.pageId
		: null,
);

const items = computed(() =>
	store.pages.map((page) => ({
		page,
		menuItem: {
			id: `ui-extension-page-${page.id}`,
			icon: page.icon ?? 'file',
			label: page.title,
			route: { to: { name: UI_EXTENSION_PAGE_VIEW, params: { pageId: page.id } } },
		} satisfies IMenuItem,
	})),
);

function onRemove(page: SidePanelView) {
	void remove(page);
}
</script>

<template>
	<div :class="$style.group" data-test-id="ui-extensions-pages-nav">
		<div :class="$style.divider" role="separator" />
		<div
			v-for="{ page, menuItem } in items"
			:key="page.id"
			:class="[
				$style.item,
				{ [$style.collapsed]: props.collapsed, [$style.removable]: !page.builtin },
			]"
		>
			<N8nMenuItem
				:item="menuItem"
				:compact="props.collapsed"
				:active="activePageId === page.id"
				data-test-id="ui-extensions-page-menu-item"
			/>
			<button
				v-if="!page.builtin && !props.collapsed"
				type="button"
				:class="$style.removeButton"
				:aria-label="
					i18n.baseText('uiExtensions.remove.label', { interpolate: { title: page.title } })
				"
				:title="i18n.baseText('uiExtensions.remove.label', { interpolate: { title: page.title } })"
				data-test-id="ui-extensions-page-remove"
				@click.stop.prevent="onRemove(page)"
			>
				<N8nIcon icon="x" size="small" />
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.group {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--2xs) var(--spacing--3xs);
}

.divider {
	margin: var(--spacing--4xs) var(--spacing--3xs) var(--spacing--3xs);
	border-top: var(--border);
}

.item {
	position: relative;

	&.removable:hover .removeButton,
	.removeButton:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}

	&.removable:not(.collapsed):hover a[role='menuitem'] {
		padding-right: var(--spacing--lg);
	}
}

.removeButton {
	position: absolute;
	right: var(--spacing--4xs);
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--5xs);
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.15s ease;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
	}
}
</style>
