<script lang="ts" setup>
import { nextTick, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { type IMenuItem, N8nResizeWrapper } from '@n8n/design-system';
import { useSettingsItems } from '@/app/composables/useSettingsItems';
import { useKeybindings } from '@/app/composables/useKeybindings';
import { useSidebarLayout } from '@/app/composables/useSidebarLayout';
import { N8nScrollArea } from '@n8n/design-system';
import BottomMenu from '@/app/components/BottomMenu.vue';
import MainSidebarHeader from '@/app/components/MainSidebarHeader.vue';
import ChatSidebarContent from '@/features/ai/chatHub/components/ChatSidebarContent.vue';

const i18n = useI18n();
const router = useRouter();

const { isCollapsed, sidebarWidth, onResizeStart, onResize, onResizeEnd, toggleCollapse } =
	useSidebarLayout();

function openCommandBar(event: MouseEvent) {
	event.stopPropagation();

	void nextTick(() => {
		const keyboardEvent = new KeyboardEvent('keydown', {
			key: 'k',
			code: 'KeyK',
			metaKey: true,
			bubbles: true,
			cancelable: true,
		});
		document.dispatchEvent(keyboardEvent);
	});
}

const { settingsItems } = useSettingsItems();

const mainMenuItems = computed<IMenuItem[]>(() => [
	{
		id: 'settings',
		label: i18n.baseText('mainSidebar.settings'),
		icon: 'settings',
		available: true,
		children: settingsItems.value,
	},
]);

const visibleMenuItems = computed<IMenuItem[]>(() =>
	mainMenuItems.value.filter((item) => item.available !== false),
);

useKeybindings({
	['bracketleft']: () => toggleCollapse(),
});

const onLogout = () => {
	void router.push({ name: VIEWS.SIGNOUT });
};
</script>

<template>
	<N8nResizeWrapper
		id="side-menu"
		:class="{
			[$style.sideMenu]: true,
			[$style.sideMenuCollapsed]: isCollapsed,
		}"
		:width="sidebarWidth"
		:style="{ width: `${sidebarWidth}px` }"
		:supported-directions="['right']"
		:min-width="200"
		:max-width="500"
		:grid-size="8"
		@resizestart="onResizeStart"
		@resize="onResize"
		@resizeend="onResizeEnd"
	>
		<MainSidebarHeader
			hide-create
			is-beta
			:is-collapsed="isCollapsed"
			@collapse="toggleCollapse"
			@open-command-bar="openCommandBar"
		/>
		<N8nScrollArea as-child>
			<div :class="$style.scrollArea">
				<ChatSidebarContent :is-collapsed="isCollapsed" />
				<BottomMenu :items="visibleMenuItems" :is-collapsed="isCollapsed" @logout="onLogout" />
			</div>
		</N8nScrollArea>
	</N8nResizeWrapper>
</template>

<style lang="scss" module>
.sideMenu {
	position: relative;
	height: 100%;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	background-color: var(--menu--color--background, var(--color--background--light-2));

	&.sideMenuCollapsed {
		width: $sidebar-width;
		min-width: auto;
	}
}

.scrollArea {
	height: 100%;
	display: flex;
	flex-direction: column;
}
</style>
