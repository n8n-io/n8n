<script setup lang="ts">
import { N8nHeading, N8nText, N8nButton, N8nIcon } from '@n8n/design-system';
import { useAuthStore } from '@/stores/auth.store';

const authStore = useAuthStore();

function handleBackToHome() {
	window.location.href = '/admin/';
}

function handleContactAdmin() {
	// TODO: 实现联系管理员功能
	alert('请联系系统管理员获取访问权限');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<div :class="$style.iconWrapper">
				<N8nIcon icon="ban" size="xlarge" :class="$style.icon" />
			</div>

			<N8nHeading tag="h1" size="2xlarge" :class="$style.title"> 403 - 访问被拒绝 </N8nHeading>

			<N8nText size="large" color="text-light" :class="$style.description">
				您没有权限访问 Telemetry 管理后台
			</N8nText>

			<N8nText size="medium" color="text-light" :class="$style.subDescription">
				只有管理员角色可以访问此系统。如果您认为这是错误，请联系系统管理员。
			</N8nText>

			<div v-if="authStore.isLoggedIn" :class="$style.userInfo">
				<N8nText size="small" color="text-light">
					当前登录用户: <strong>{{ authStore.userName }}</strong>
				</N8nText>
				<N8nText size="small" color="text-light">
					角色: <strong>{{ authStore.user?.role }}</strong>
				</N8nText>
			</div>

			<div :class="$style.actions">
				<N8nButton type="primary" size="large" @click="handleBackToHome"> 返回首页 </N8nButton>
				<N8nButton type="secondary" size="large" @click="handleContactAdmin">
					联系管理员
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: var(--spacing--xl);
}

.content {
	background: var(--color--background);
	padding: var(--spacing--3xl);
	border-radius: var(--radius--xl);
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	text-align: center;
	max-width: 600px;
	width: 100%;
}

.iconWrapper {
	margin-bottom: var(--spacing--lg);
	display: flex;
	justify-content: center;
}

.icon {
	color: var(--color--danger);
}

.title {
	margin-bottom: var(--spacing--md);
	color: var(--color--text);
}

.description {
	margin-bottom: var(--spacing--sm);
	display: block;
}

.subDescription {
	margin-bottom: var(--spacing--xl);
	display: block;
}

.userInfo {
	background: var(--color--background--light-2);
	padding: var(--spacing--md);
	border-radius: var(--radius);
	margin-bottom: var(--spacing--xl);
	text-align: left;

	> * {
		display: block;
		margin-bottom: var(--spacing--2xs);

		&:last-child {
			margin-bottom: 0;
		}
	}

	strong {
		font-weight: var(--font-weight--bold);
		color: var(--color--text);
	}
}

.actions {
	display: flex;
	gap: var(--spacing--sm);
	justify-content: center;
}
</style>
