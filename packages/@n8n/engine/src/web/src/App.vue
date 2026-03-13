<script lang="ts" setup>
import { RouterView } from 'vue-router';
</script>

<template>
	<div :class="$style.app">
		<RouterView />
	</div>
</template>

<style module>
:global(*) {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
}

:global(:root) {
	/* Primary -- matches n8n brand */
	--color-primary: #ff6d5a;
	--color-primary-shade: #e2553f;
	--color-primary-tint-1: #ff8a7a;
	--color-primary-tint-2: #fff2f0;

	/* Semantic */
	--color-success: #17bf63;
	--color-success-shade: #109e4f;
	--color-success-tint: #e8f8ef;
	--color-danger: #ff4949;
	--color-danger-shade: #e03030;
	--color-danger-tint: #fff1f1;
	--color-warning: #f5a623;
	--color-warning-shade: #d48e14;
	--color-warning-tint: #fef8ee;
	--color-info: #3b82f6;
	--color-info-shade: #2563eb;
	--color-info-tint: #eff6ff;

	/* Text */
	--color-text: #1a1a1a;
	--color-text-light: #525252;
	--color-text-lighter: #8b8b8b;
	--color-text-placeholder: #b5b5b5;

	/* Surfaces */
	--color-bg: #ffffff;
	--color-bg-light: #fafafa;
	--color-bg-medium: #f5f5f5;
	--color-bg-dark: #ebebeb;
	--color-border: #dbdbdb;
	--color-border-light: #eeeeee;

	/* Spacing */
	--spacing-3xs: 2px;
	--spacing-2xs: 4px;
	--spacing-xs: 8px;
	--spacing-sm: 12px;
	--spacing-md: 16px;
	--spacing-lg: 24px;
	--spacing-xl: 32px;
	--spacing-2xl: 48px;
	--spacing-3xl: 64px;

	/* Radius */
	--radius-xs: 2px;
	--radius-sm: 4px;
	--radius-md: 8px;
	--radius-lg: 12px;
	--radius-xl: 16px;

	/* Typography */
	--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	--font-family-mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', Menlo, monospace;
	--font-size-2xs: 11px;
	--font-size-xs: 12px;
	--font-size-sm: 13px;
	--font-size-md: 14px;
	--font-size-lg: 16px;
	--font-size-xl: 20px;
	--font-size-2xl: 24px;
	--font-size-3xl: 32px;
	--font-weight-regular: 400;
	--font-weight-medium: 500;
	--font-weight-semibold: 600;
	--font-weight-bold: 700;
	--line-height-tight: 1.25;
	--line-height-normal: 1.5;
	--line-height-relaxed: 1.75;

	/* Shadows */
	--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
	--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
	--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);

	/* Transitions */
	--transition-fast: 120ms ease;
	--transition-normal: 200ms ease;
	--transition-slow: 300ms ease;
}

@media (prefers-color-scheme: dark) {
	:global(:root) {
		--color-primary: #ff8a7a;
		--color-primary-shade: #ff6d5a;
		--color-primary-tint-1: #ff6d5a;
		--color-primary-tint-2: #3d2020;

		--color-success: #4ade80;
		--color-success-shade: #22c55e;
		--color-success-tint: #14291e;
		--color-danger: #f87171;
		--color-danger-shade: #ef4444;
		--color-danger-tint: #3d1414;
		--color-warning: #fbbf24;
		--color-warning-shade: #f59e0b;
		--color-warning-tint: #3d3014;
		--color-info: #60a5fa;
		--color-info-shade: #3b82f6;
		--color-info-tint: #1e2a3d;

		--color-text: #e4e4e7;
		--color-text-light: #a1a1aa;
		--color-text-lighter: #71717a;
		--color-text-placeholder: #52525b;

		--color-bg: #18181b;
		--color-bg-light: #1f1f23;
		--color-bg-medium: #27272a;
		--color-bg-dark: #3f3f46;
		--color-border: #3f3f46;
		--color-border-light: #27272a;
	}
}

:global(body) {
	font-family: var(--font-family);
	font-size: var(--font-size-md);
	color: var(--color-text);
	background: var(--color-bg-light);
	line-height: var(--line-height-normal);
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

:global(a) {
	color: inherit;
	text-decoration: none;
}

:global(button) {
	font-family: inherit;
	cursor: pointer;
}

.app {
	height: 100vh;
	overflow: hidden;
}
</style>
