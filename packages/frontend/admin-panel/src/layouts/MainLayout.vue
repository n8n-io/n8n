<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';

const sidebarCollapsed = ref(false);

function toggleSidebar() {
	sidebarCollapsed.value = !sidebarCollapsed.value;
}
</script>

<template>
	<div :class="[$style.layout, { [$style.sidebarCollapsed]: sidebarCollapsed }]">
		<!-- 侧边栏 -->
		<aside :class="$style.sidebar">
			<Sidebar :collapsed="sidebarCollapsed" />
		</aside>

		<!-- 主内容区 -->
		<div :class="$style.main">
			<!-- 顶部导航栏 -->
			<header :class="$style.header">
				<Header @toggle-sidebar="toggleSidebar" />
			</header>

			<!-- 内容区域 -->
			<main :class="$style.content">
				<RouterView />
			</main>
		</div>
	</div>
</template>

<style lang="scss" module>
.layout {
	display: flex;
	height: 100vh;
	overflow: hidden;
}

.sidebar {
	width: 240px;
	height: 100vh;
	background: var(--color--background--shade-1);
	border-right: var(--border);
	transition: width 0.3s ease;
	overflow: hidden;
}

.main {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.header {
	height: 60px;
	background: var(--color--background);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.content {
	flex: 1;
	overflow-y: auto;
	background: var(--color--background--light-2);
}

/* 侧边栏收起状态 */
.sidebarCollapsed {
	.sidebar {
		width: 64px;
	}
}
</style>
