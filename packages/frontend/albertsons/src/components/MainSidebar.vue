<script setup>
import albertsonsLogo from '../assets/albertsons-logo.png';

const menuItems = [
	{ label: 'Dashboard', key: 'dashboard', active: true },
	{ label: 'Playground', key: 'playground', active: false },
	{ label: 'AI Agent Builder', key: 'builder', active: false },
	{ label: 'Templates', key: 'templates', active: false },
	{ label: 'How to use', key: 'howto', active: false },
	{ label: 'FAQs', key: 'faqs', active: false },
];

const renderIcon = (key) => {
	switch (key) {
		case 'dashboard':
			// grid
			return `
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" />
          <rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" />
        </svg>`;
		case 'playground':
			// play circle
			return `
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6" />
          <path d="M9 7.5L13 10L9 12.5V7.5Z" fill="currentColor" />
        </svg>`;
		case 'builder':
			// sparkles / star
			return `
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M10 2.5L11.4 6.3L15.5 6.7L12.4 9.3L13.3 13.3L10 11.3L6.7 13.3L7.6 9.3L4.5 6.7L8.6 6.3L10 2.5Z"
                fill="currentColor" />
        </svg>`;
		case 'templates':
			// documents
			return `
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="4" y="3" width="9" height="14" rx="1.5"
                stroke="currentColor" stroke-width="1.6" />
          <path d="M8 7H12M8 10H12M8 13H11"
                stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" />
        </svg>`;
		case 'howto':
			// book
			return `
        <svg viewBox="0 0 20 20" fill="none">
          <path d="M4.5 4C4.5 3.17 5.17 2.5 6 2.5H15v12.5H6c-.83 0-1.5.67-1.5 1.5V4Z"
                stroke="currentColor" stroke-width="1.6" />
          <path d="M6 5h5" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" />
        </svg>`;
		case 'faqs':
			// question mark
			return `
        <svg viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8"
                  stroke="currentColor" stroke-width="1.6" />
          <path d="M8.6 7.2C8.9 6.4 9.6 6 10.2 6c.9 0 1.8.6 1.8 1.7 0 .9-.6 1.3-1.1 1.6-.5.3-.9.6-.9 1.4V11"
                stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" />
          <circle cx="10" cy="13.6" r=".8" fill="currentColor" />
        </svg>`;
		default:
			return '';
	}
};
</script>

<template>
	<aside class="sidebar">
		<!-- Logo / brand -->
		<div class="sidebar-header">
			<img :src="albertsonsLogo" alt="Albertsons" class="sidebar-logo" />
			<div class="sidebar-title">
				<div class="sidebar-title-main">Albertsons</div>
				<div class="sidebar-title-sub">AI Agent Space</div>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="sidebar-nav">
			<button
				v-for="item in menuItems"
				:key="item.label"
				class="sidebar-nav-item"
				:class="{ 'sidebar-nav-item--active': item.active }"
				type="button"
			>
				<span class="sidebar-nav-icon" v-html="renderIcon(item.key)" />
				<span class="sidebar-nav-label">{{ item.label }}</span>
			</button>
		</nav>

		<!-- User footer -->
		<div class="sidebar-user">
			<div class="sidebar-user-avatar">RI</div>
			<div class="sidebar-user-info">
				<div class="sidebar-user-name">Risha I.M</div>
				<div class="sidebar-user-email">risha@sashai.tech</div>
			</div>
			<button type="button" class="sidebar-user-menu">⋯</button>
		</div>
	</aside>
</template>

<style scoped>
.sidebar {
	width: 240px;
	min-height: 100vh;
	border-right: 1px solid #e5e7eb;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
	font-family:
		system-ui,
		-apple-system,
		BlinkMacSystemFont,
		'Segoe UI',
		sans-serif;
}

/* Header */
.sidebar-header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 16px 18px 14px;
	border-bottom: 1px solid #e5e7eb;
}

.sidebar-logo {
	height: 28px;
	width: 28px;
	object-fit: contain;
}

.sidebar-title-main {
	font-size: 13px;
	font-weight: 600;
	color: #111827;
}

.sidebar-title-sub {
	font-size: 11px;
	color: #6b7280;
}

/* Nav */
.sidebar-nav {
	padding: 10px 8px 0;
	flex: 1 1 auto;
}

.sidebar-nav-item {
	width: 100%;
	border: none;
	background: transparent;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px;
	border-radius: 999px;
	color: #374151;
	font-size: 13px;
	cursor: pointer;
}

.sidebar-nav-item:hover {
	background-color: #f3f4f6;
}

.sidebar-nav-item--active {
	background-color: #0071ce;
	color: #ffffff;
}

/* SVG icon container */
.sidebar-nav-icon {
	width: 18px;
	height: 18px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #6b7280;
}

.sidebar-nav-item--active .sidebar-nav-icon {
	color: #ffffff;
}

.sidebar-nav-icon svg {
	width: 18px;
	height: 18px;
}

.sidebar-nav-label {
	white-space: nowrap;
}

/* User footer */
.sidebar-user {
	padding: 10px 14px 14px;
	border-top: 1px solid #e5e7eb;
	display: flex;
	align-items: center;
	gap: 10px;
}

.sidebar-user-avatar {
	width: 32px;
	height: 32px;
	border-radius: 999px;
	background: #f97373;
	color: #ffffff;
	font-size: 13px;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
}

.sidebar-user-info {
	flex: 1 1 auto;
}

.sidebar-user-name {
	font-size: 13px;
	font-weight: 500;
	color: #111827;
}

.sidebar-user-email {
	font-size: 11px;
	color: #6b7280;
}

.sidebar-user-menu {
	border: none;
	background: transparent;
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
	color: #9ca3af;
}
</style>
