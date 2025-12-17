<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import albertsonsLogo from '../assets/albertsons-logo.png';

const router = useRouter();
const route = useRoute();
const isCollapsed = ref(false);

const menuItems = ref([
	{ label: 'Pulse', key: 'pulse', path: '/dashboard', active: false },
	{ label: 'My Agents', key: 'agents', path: '/agents', active: false },
	{ label: 'Projects', key: 'projects', path: '/projects', active: false },
	{ label: 'Executions', key: 'executions', path: '/executions', active: false },
	{ label: 'Templates', key: 'templates', path: '/templates', active: false },
	{ label: 'Agent Library', key: 'library', path: '/agent-library', active: false },
	{ label: 'Teams', key: 'teams', path: '/teams', active: false },
	{ label: 'Settings', key: 'settings', path: '/settings', active: false },
]);

function navigate(item) {
	router.push(item.path);
	updateActiveState();
}

function updateActiveState() {
	menuItems.value.forEach((i) => (i.active = false));
	menuItems.value.forEach((i) => {
		if (route.path.startsWith(i.path)) i.active = true;
	});
}

function toggleSidebar() {
	isCollapsed.value = !isCollapsed.value;
}

watch(() => route.path, updateActiveState, { immediate: true });

const renderIcon = (key) => {
	switch (key) {
		case 'pulse':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
			</svg>`;
		case 'agents':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
				<circle cx="12" cy="7" r="4"/>
			</svg>`;
		case 'projects':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
			</svg>`;
		case 'executions':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="5 3 19 12 5 21 5 3"/>
			</svg>`;
		case 'templates':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
				<line x1="9" y1="3" x2="9" y2="21"/>
			</svg>`;
		case 'library':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
				<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
			</svg>`;
		case 'teams':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
				<circle cx="9" cy="7" r="4"/>
				<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
				<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
			</svg>`;
		case 'settings':
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="3"/>
				<path d="M12 1v6m0 6v6m9-11h-6m-6 0H3"/>
			</svg>`;
		default:
			return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"/>
			</svg>`;
	}
};
</script>

<template>
	<aside class="sidebar" :class="{ 'sidebar--collapsed': isCollapsed }">
		<!-- Header -->
		<div class="sidebar-header">
			<img :src="albertsonsLogo" alt="Albertsons" class="sidebar-logo" />
			<div v-if="!isCollapsed" class="sidebar-title">
				<div class="sidebar-title-main">Albertsons</div>
			</div>
		</div>

		<!-- AI AgentSpace Title -->
		<div v-if="!isCollapsed" class="sidebar-subtitle">AI AgentSpace</div>

		<!-- Navigation -->
		<nav class="sidebar-nav">
			<button
				v-for="item in menuItems"
				:key="item.key"
				class="sidebar-nav-item"
				:class="{ 'sidebar-nav-item--active': item.active }"
				@click="navigate(item)"
				:title="isCollapsed ? item.label : ''"
			>
				<span class="sidebar-nav-icon" v-html="renderIcon(item.key)" />
				<span v-if="!isCollapsed" class="sidebar-nav-label">{{ item.label }}</span>
			</button>
		</nav>

		<!-- Footer with User Profile -->
		<div class="sidebar-footer">
			<div class="sidebar-user">
				<div class="sidebar-user-avatar">SJ</div>
				<div v-if="!isCollapsed" class="sidebar-user-info">
					<div class="sidebar-user-name">Sarah Johnson</div>
					<div class="sidebar-user-role">Engineering</div>
				</div>
				<svg
					v-if="!isCollapsed"
					class="sidebar-user-dropdown"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</div>
		</div>

		<!-- Toggle Button - Right Side Middle -->
		<button
			class="sidebar-collapse-toggle"
			@click="toggleSidebar"
			:title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline v-if="!isCollapsed" points="15 18 9 12 15 6" />
				<polyline v-else points="9 18 15 12 9 6" />
			</svg>
		</button>
	</aside>
</template>

<style scoped>
.sidebar {
	width: 240px;
	min-height: 100vh;
	border-right: 1px solid var(--border-color--light);
	background-color: var(--color--background--light-3);
	display: flex;
	flex-direction: column;
	transition: width 0.3s ease;
	position: relative;
}

.sidebar--collapsed {
	width: 64px;
}

/* Header */
.sidebar-header {
	padding: 20px 16px 12px;
	display: flex;
	align-items: center;
	gap: 12px;
}

.sidebar-logo {
	height: 32px;
	width: 32px;
	object-fit: contain;
	flex-shrink: 0;
}

.sidebar-title {
	overflow: hidden;
	white-space: nowrap;
}

.sidebar-title-main {
	font-size: 16px;
	font-weight: 700;
	color: var(--color--primary);
}

/* AI AgentSpace Subtitle */
.sidebar-subtitle {
	padding: 0px 15px 15px 34px;
	font-size: 15px;
	color: var(--color--primary);
	font-weight: 500;
}

/* Navigation */
.sidebar-nav {
	padding: 8px 12px;
	flex: 1;
	overflow-y: auto;
}

.sidebar-nav-item {
	width: 100%;
	border: none;
	background: transparent;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	margin-bottom: 4px;
	border-radius: var(--radius);
	color: var(--color--text);
	font-size: 14px;
	cursor: pointer;
	transition: all 0.2s;
	text-align: left;
}

.sidebar--collapsed .sidebar-nav-item {
	justify-content: center;
	padding: 10px;
}

.sidebar-nav-item:hover {
	background-color: var(--color--background--light-2);
}

.sidebar-nav-item--active {
	background-color: var(--color--background--light-1);
	color: var(--color--primary);
	font-weight: 500;
}

.sidebar-nav-icon {
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	color: currentColor;
}

.sidebar-nav-icon svg {
	width: 20px;
	height: 20px;
}

.sidebar-nav-label {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* Footer with User Profile */
.sidebar-footer {
	padding: 12px 16px;
	border-top: 1px solid var(--border-color--light);
}

.sidebar-user {
	display: flex;
	align-items: center;
	gap: 10px;
	cursor: pointer;
	padding: 6px;
	border-radius: var(--radius);
	transition: background 0.2s;
}

.sidebar-user:hover {
	background-color: var(--color--background--light-2);
}

.sidebar--collapsed .sidebar-user {
	justify-content: center;
	padding: 6px;
}

.sidebar-user-avatar {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color--primary);
	color: var(--color--text--tint-3);
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 600;
	font-size: 13px;
	flex-shrink: 0;
}

.sidebar-user-info {
	overflow: hidden;
	white-space: nowrap;
	flex: 1;
}

.sidebar-user-name {
	font-size: 13px;
	font-weight: 600;
	color: var(--color--text--shade-1);
	overflow: hidden;
	text-overflow: ellipsis;
}

.sidebar-user-role {
	font-size: 11px;
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
}

.sidebar-user-dropdown {
	width: 16px;
	height: 16px;
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

/* Collapse Toggle Button - Right Side Middle */
.sidebar-collapse-toggle {
	position: absolute;
	right: -12px;
	top: 50%;
	transform: translateY(-50%);
	width: 24px;
	height: 24px;
	border: 1px solid var(--border-color--light);
	border-radius: 50%;
	background: var(--color--background--light-3);
	color: var(--color--text);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
	z-index: 10;
	box-shadow: var(--shadow--light);
}

.sidebar-collapse-toggle:hover {
	background: var(--color--background--light-2);
	border-color: var(--border-color);
	box-shadow: var(--shadow);
}

.sidebar-collapse-toggle svg {
	width: 14px;
	height: 14px;
}

/* Scrollbar */
.sidebar-nav::-webkit-scrollbar {
	width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
	background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
	background: var(--color--foreground);
	border-radius: 2px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
	background: var(--color--foreground--shade-1);
}

/* Responsive */
@media (max-width: 768px) {
	.sidebar {
		position: fixed;
		left: 0;
		top: 0;
		z-index: 1000;
		height: 100vh;
	}

	.sidebar--collapsed {
		transform: translateX(-100%);
	}

	.sidebar-collapse-toggle {
		display: none;
	}
}
</style>
