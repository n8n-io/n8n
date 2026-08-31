<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { ABOUT_MODAL_KEY, LOCAL_STORAGE_SETTINGS_SIDEBAR_WIDTH } from '@/app/constants';

import {
	N8nIcon,
	N8nInput,
	N8nLink,
	N8nMenuItem,
	N8nResizeWrapper,
	N8nText,
} from '@n8n/design-system';
import { useSettingsItems } from '../composables/useSettingsItems';
import { useAiGateway } from '../composables/useAiGateway';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '../stores/ui.store';
import {
	clampSettingsSidebarWidth,
	DEFAULT_SETTINGS_SIDEBAR_WIDTH,
	filterSettingsEntries,
	MAX_SETTINGS_SIDEBAR_WIDTH,
	MIN_SETTINGS_SIDEBAR_WIDTH,
} from '../composables/settingsSidebar.utils';

const emit = defineEmits<{
	return: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();

const { settingsEntries, handleSettingsItemSelect } = useSettingsItems();
const { fetchWallet, isEnabled } = useAiGateway();

const searchQuery = ref('');
const isResizing = ref(false);
const isListScrolled = ref(false);
const persistedWidth = useLocalStorage(
	LOCAL_STORAGE_SETTINGS_SIDEBAR_WIDTH,
	DEFAULT_SETTINGS_SIDEBAR_WIDTH,
);

const sidebarWidth = computed({
	get: () => clampSettingsSidebarWidth(persistedWidth.value),
	set: (width) => {
		persistedWidth.value = width;
	},
});

const visibleEntries = computed(() =>
	filterSettingsEntries(settingsEntries.value, searchQuery.value),
);

function onResizeStart() {
	isResizing.value = true;
}

function onResize(event: { width: number }) {
	sidebarWidth.value = event.width;
}

function onResizeEnd() {
	isResizing.value = false;
}

function onListScroll(event: Event) {
	const target = event.currentTarget;
	if (!(target instanceof HTMLElement)) {
		return;
	}

	isListScrolled.value = target.scrollTop > 0;
}

onMounted(() => {
	if (isEnabled.value) void fetchWallet();
});
</script>

<template>
	<N8nResizeWrapper
		data-test-id="settings-sidebar"
		:class="{
			[$style.container]: true,
			[$style.resizing]: isResizing,
		}"
		:width="sidebarWidth"
		:style="{ width: `${sidebarWidth}px` }"
		:supported-directions="['right']"
		:min-width="MIN_SETTINGS_SIDEBAR_WIDTH"
		:max-width="MAX_SETTINGS_SIDEBAR_WIDTH"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
	>
		<header :class="$style.header">
			<div :class="$style.returnButton" data-test-id="settings-back" @click="emit('return')">
				<span :class="$style.iconBox">
					<N8nIcon icon="arrow-left" size="large" />
				</span>
				<N8nText bold>{{ i18n.baseText('settings') }}</N8nText>
			</div>
			<N8nInput
				v-model="searchQuery"
				:class="$style.search"
				size="small"
				clearable
				:placeholder="i18n.baseText('settings.sidebar.search.placeholder')"
				:aria-label="i18n.baseText('settings.sidebar.search.placeholder')"
				data-test-id="settings-sidebar-search"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
		</header>

		<main :class="$style.body">
			<nav :class="$style.items" :aria-label="i18n.baseText('settings')" @scroll="onListScroll">
				<section
					v-for="group in visibleEntries"
					:key="group.id"
					:class="$style.group"
					:aria-labelledby="`settings-sidebar-group-${group.id}`"
					:data-test-id="`settings-sidebar-group-${group.id}`"
				>
					<N8nText
						:id="`settings-sidebar-group-${group.id}`"
						tag="h2"
						size="small"
						color="text-light"
						bold
						:class="$style.groupLabel"
						:title="group.label"
					>
						{{ group.label }}
					</N8nText>
					<div>
						<N8nMenuItem
							v-for="item in group.items"
							:key="item.id"
							:item="item"
							@click="handleSettingsItemSelect(item.id)"
						/>
					</div>
				</section>
				<N8nText
					v-if="visibleEntries.length === 0"
					size="small"
					color="text-light"
					:class="$style.empty"
					data-test-id="settings-sidebar-empty"
				>
					{{ i18n.baseText('settings.sidebar.search.empty') }}
				</N8nText>
			</nav>
			<div
				:class="[$style.fadeTop, { [$style.fadeTopVisible]: isListScrolled }]"
				aria-hidden="true"
			/>
		</main>

		<footer :class="$style.footer">
			<N8nLink size="small" @click="uiStore.openModal(ABOUT_MODAL_KEY)">
				{{ i18n.baseText('settings.version') }} {{ rootStore.versionCli }}
			</N8nLink>
		</footer>
	</N8nResizeWrapper>
</template>

<style lang="scss" module>
.container {
	--settings-sidebar--icon-box: var(--spacing--lg);
	--settings-sidebar--content-inset: var(--spacing--xs);
	--settings-sidebar--icon-glyph: var(--spacing--sm);
	--settings-sidebar-padding: 20px;

	height: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	overflow: hidden;
	will-change: width;
}

.resizing {
	user-select: none;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-inline: var(--settings-sidebar-padding);
	padding-top: var(--settings-sidebar-padding);
	padding-bottom: var(--spacing--sm);
	flex-shrink: 0;
}

.iconBox {
	border: 1px solid red;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.returnButton {
	cursor: pointer;
	display: flex;
	gap: var(--spacing--4xs);
	align-items: center;

	&:hover {
		color: var(--color--primary);
	}
}

.body {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.items {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 calc(var(--settings-sidebar-padding) - 8px);
	flex: 1;
	overflow: auto;
}

.fadeTop {
	position: absolute;
	top: 0;
	right: 0;
	left: 0;
	height: var(--spacing--xl);
	background: linear-gradient(to bottom, var(--color--background--light-3), transparent);
	opacity: 0;
	pointer-events: none;
	z-index: 1;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}

.fadeTopVisible {
	opacity: 1;
}

.group {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.groupLabel {
	line-height: 1;
	min-width: 0;
	padding-left: 8px;
	@include mixins.utils-ellipsis;
}

.empty {
	padding: var(--spacing--xs) var(--spacing--4xs);
}

.footer {
	padding-inline: var(--settings-sidebar-padding);
	padding-bottom: var(--settings-sidebar-padding);
}

@media screen and (max-height: 420px) {
	.footer {
		display: none;
	}
}
</style>
