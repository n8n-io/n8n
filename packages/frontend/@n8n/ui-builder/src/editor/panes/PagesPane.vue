<script setup lang="ts">
import { N8nButton, N8nIconButton, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';

import PaneShell from './PaneShell.vue';
import { pageLabel } from '../../core/pages';
import type { UiPageInfo } from '../../core/types';

/**
 * The pages of the app: add, rename, star as default, delete, and pick which
 * one the canvas is showing.
 *
 * Selecting a row changes what the outline below it is showing, which is why
 * the two share a column.
 */
defineOptions({ name: 'PagesPane' });

defineProps<{
	pages: UiPageInfo[];
	currentId?: string;
	defaultId?: string;
	renamingId?: string;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	add: [];
	select: [id: string];
	remove: [id: string];
	makeDefault: [id: string];
	rename: [id: string, title: string];
	'update:renamingId': [id: string | undefined];
}>();
</script>

<template>
	<PaneShell title="Pages" flush>
		<template #header>
			<N8nIconButton
				variant="ghost"
				size="xsmall"
				icon="plus"
				aria-label="Add a page"
				:disabled="disabled"
				@click="emit('add')"
			/>
		</template>

		<template v-if="pages.length">
			<div
				v-for="page in pages"
				:key="page.id"
				class="ui-page-row"
				:class="{ 'ui-page-row--current': page.id === currentId }"
			>
				<N8nInput
					v-if="renamingId === page.id"
					class="ui-page-row__rename"
					:model-value="page.title"
					size="small"
					@update:model-value="emit('rename', page.id, $event)"
					@blur="emit('update:renamingId', undefined)"
					@keydown.enter="emit('update:renamingId', undefined)"
				/>

				<button
					v-else
					type="button"
					class="ui-page-row__label"
					@click="emit('select', page.id)"
					@dblclick="emit('update:renamingId', page.id)"
				>
					<span class="ui-page-row__title">{{ pageLabel(page) }}</span>
					<span class="ui-page-row__path">{{ page.path }}</span>
				</button>

				<div class="ui-page-row__actions">
					<N8nTooltip
						:content="
							page.id === defaultId
								? 'The app opens on this page'
								: 'Make this the page the app opens on'
						"
					>
						<N8nIconButton
							variant="ghost"
							size="xsmall"
							:icon="page.id === defaultId ? 'star-filled' : 'star'"
							aria-label="Make this the default page"
							:disabled="disabled || page.id === defaultId"
							@click="emit('makeDefault', page.id)"
						/>
					</N8nTooltip>

					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="pencil"
						aria-label="Rename this page"
						:disabled="disabled"
						@click="emit('update:renamingId', page.id)"
					/>

					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="trash-2"
						aria-label="Delete this page"
						:disabled="disabled"
						@click="emit('remove', page.id)"
					/>
				</div>
			</div>
		</template>

		<div v-else class="ui-pages-empty">
			<N8nText size="small" color="text-light">
				One page. Adding another wraps what you have in an app frame, with a header and footer that
				stay put as the page swaps.
			</N8nText>

			<N8nButton variant="outline" size="mini" :disabled="disabled" @click="emit('add')">
				Add pages
			</N8nButton>
		</div>
	</PaneShell>
</template>

<style scoped>
.ui-pages-empty {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
}

.ui-page-row {
	display: flex;
	align-items: center;
}

.ui-page-row:hover {
	background-color: var(--background--hover);
}

.ui-page-row:hover .ui-page-row__actions,
.ui-page-row:focus-within .ui-page-row__actions {
	visibility: visible;
}

/*
 * The page being edited, which is not the same as the selected node: you can be
 * editing a page's subtree with a button selected.
 */
.ui-page-row--current {
	background-color: var(--background--active);
}

.ui-page-row--current .ui-page-row__actions {
	visibility: visible;
}

.ui-page-row__label {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: none;
	background: none;
	color: inherit;
	font-size: var(--font-size--2xs);
	text-align: left;
	cursor: pointer;
}

.ui-page-row__title {
	white-space: nowrap;
}

.ui-page-row__path {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
}

/* Held in the layout rather than removed, so rows do not jump on hover. */
.ui-page-row__actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding-right: var(--spacing--4xs);
	visibility: hidden;
}

.ui-page-row__rename {
	flex: 1;
	min-width: 0;
	padding: 0 var(--spacing--4xs);
}
</style>
