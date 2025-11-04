<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { modules } from '@/config/modules';
import type { AdminModule } from '@/config/modules';

interface Props {
	collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	collapsed: false,
});

const route = useRoute();
const router = useRouter();

const isActive = (modulePath: string) => {
	return route.path.startsWith(modulePath);
};

function navigateTo(module: AdminModule) {
	if (!module.enabled) {
		return; // 未启用的模块不可点击
	}
	router.push(module.path);
}
</script>

<template>
	<div :class="$style.sidebar">
		<!-- Logo -->
		<div :class="$style.logo">
			<div :class="$style.logoIcon">
				<font-awesome-icon icon="cogs" />
			</div>
			<transition name="fade">
				<div v-if="!collapsed" :class="$style.logoText">n8n 管理后台</div>
			</transition>
		</div>

		<!-- 导航菜单 -->
		<nav :class="$style.nav">
			<div
				v-for="module in modules"
				:key="module.id"
				:class="[
					$style.navItem,
					{
						[$style.active]: isActive(module.path),
						[$style.disabled]: !module.enabled,
					},
				]"
				@click="navigateTo(module)"
			>
				<div :class="$style.navIcon">
					<font-awesome-icon :icon="module.icon" />
				</div>
				<transition name="fade">
					<div v-if="!collapsed" :class="$style.navText">
						{{ module.name }}
						<span v-if="!module.enabled" :class="$style.comingSoon">即将上线</span>
					</div>
				</transition>
			</div>
		</nav>

		<!-- 底部信息 -->
		<div :class="$style.footer">
			<transition name="fade">
				<div v-if="!collapsed" :class="$style.footerText">v1.0.0</div>
			</transition>
		</div>
	</div>
</template>

<style lang="scss" module>
.sidebar {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: var(--spacing--md);
}

.logo {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	margin-bottom: var(--spacing--lg);
	border-bottom: var(--border);
}

.logoIcon {
	font-size: 24px;
	color: var(--color--primary);
	flex-shrink: 0;
}

.logoText {
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
}

.nav {
	flex: 1;
	overflow-y: auto;
}

.navItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	margin-bottom: var(--spacing--xs);
	border-radius: var(--radius);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover:not(.disabled) {
		background: var(--color--foreground--tint-2);
	}

	&.active {
		background: var(--color--primary--tint-3);
		color: var(--color--primary);
	}

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.navIcon {
	font-size: 18px;
	flex-shrink: 0;
	width: 18px;
	text-align: center;
}

.navText {
	font-size: var(--font-size--sm);
	white-space: nowrap;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.comingSoon {
	font-size: var(--font-size--3xs);
	padding: 2px 6px;
	background: var(--color--warning--tint-2);
	color: var(--color--warning--shade-1);
	border-radius: var(--radius--sm);
}

.footer {
	padding-top: var(--spacing--md);
	border-top: var(--border);
	text-align: center;
}

.footerText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
