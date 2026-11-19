<script setup lang="ts">
import {
	N8nLogo,
	N8nMenuItem,
	N8nSelect2,
	N8nText,
	type IMenuItem,
	type SelectItem,
	type SelectValue,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/** The sidebar of the Tasks area. It takes the place of the main n8n sidebar. */
defineProps<{
	boardId: string | undefined;
	boardItems: SelectItem[];
	pageItems: IMenuItem[];
	footerItems: IMenuItem[];
	activePage: string | undefined;
}>();
const emit = defineEmits<{ selectBoard: [boardId: string] }>();
const i18n = useI18n();

function onSelectBoard(value: SelectValue | undefined) {
	if (typeof value === 'string') emit('selectBoard', value);
}
</script>

<template>
	<nav
		:class="$style.sidebar"
		:aria-label="i18n.baseText('taskBoard.nav.title')"
		data-test-id="tasks-sidebar"
	>
		<div :class="$style.brand">
			<N8nLogo size="small" :collapsed="true" />
			<N8nText bold size="large" color="text-dark">
				{{ i18n.baseText('taskBoard.nav.title') }}
			</N8nText>
		</div>
		<N8nSelect2
			:model-value="boardId"
			:items="boardItems"
			:placeholder="i18n.baseText('taskBoard.nav.boardPlaceholder')"
			:aria-label="i18n.baseText('taskBoard.nav.board')"
			size="medium"
			data-test-id="tasks-sidebar-board-select"
			@update:model-value="onSelectBoard"
		/>
		<div :class="$style.items" role="menu">
			<N8nMenuItem
				v-for="item in pageItems"
				:key="item.id"
				:item="item"
				:active="item.id === activePage"
			/>
		</div>
		<div :class="[$style.items, $style.footer]" role="menu">
			<N8nMenuItem
				v-for="item in footerItems"
				:key="item.id"
				:item="item"
				:active="item.id === activePage"
			/>
		</div>
	</nav>
</template>

<style lang="scss" module>
.sidebar {
	display: flex;
	flex: 0 0 auto;
	flex-direction: column;
	gap: var(--spacing--xs);
	/* The width of the main n8n sidebar. The spacing scale has no token this wide. */
	width: 12.5rem;
	height: 100%;
	padding: var(--spacing--xs) var(--spacing--3xs);
	border-right: var(--border);
	background-color: var(--color--background--light-3);
	overflow-y: auto;
}

.brand {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
}

.items {
	display: flex;
	flex-direction: column;
}

.footer {
	margin-top: auto;
}
</style>
