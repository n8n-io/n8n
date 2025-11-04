<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useAuthStore } from '@/stores/auth.store';

const emit = defineEmits<{
	(e: 'toggle-sidebar'): void;
}>();

const authStore = useAuthStore();

function handleLogout() {
	authStore.logout();
}

function goToMainApp() {
	window.location.href = '/';
}
</script>

<template>
	<div :class="$style.header">
		<!-- 左侧 -->
		<div :class="$style.left">
			<button :class="$style.menuBtn" @click="emit('toggle-sidebar')">
				<font-awesome-icon icon="bars" />
			</button>
		</div>

		<!-- 右侧 -->
		<div :class="$style.right">
			<!-- 返回主应用 -->
			<N8nButton type="secondary" size="small" @click="goToMainApp">
				<font-awesome-icon icon="arrow-left" />
				返回 n8n
			</N8nButton>

			<!-- 用户信息 -->
			<div :class="$style.user">
				<div :class="$style.userAvatar">
					<font-awesome-icon icon="user-circle" />
				</div>
				<div :class="$style.userInfo">
					<div :class="$style.userName">{{ authStore.userName }}</div>
					<div :class="$style.userRole">管理员</div>
				</div>
			</div>

			<!-- 退出登录 -->
			<N8nButton type="secondary" size="small" @click="handleLogout">
				<font-awesome-icon icon="sign-out-alt" />
				退出
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 var(--spacing--lg);
	height: 100%;
}

.left {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
}

.menuBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border: none;
	background: transparent;
	cursor: pointer;
	border-radius: var(--radius);
	color: var(--color--text);
	font-size: 18px;
	transition: background 0.2s;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.right {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
}

.user {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius);
	background: var(--color--foreground--tint-2);
}

.userAvatar {
	font-size: 24px;
	color: var(--color--primary);
}

.userInfo {
	display: flex;
	flex-direction: column;
}

.userName {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	line-height: 1.2;
}

.userRole {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	line-height: 1.2;
}
</style>
