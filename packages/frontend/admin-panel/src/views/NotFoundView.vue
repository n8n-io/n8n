<script setup lang="ts">
import { N8nHeading, N8nText, N8nButton, N8nIcon } from '@n8n/design-system';
import { useRouter } from 'vue-router';

const router = useRouter();

function handleBackToDashboard() {
	router.push({ name: 'Dashboard' });
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.content">
			<div :class="$style.iconWrapper">
				<N8nIcon icon="search" size="xlarge" :class="$style.icon" />
			</div>

			<N8nHeading tag="h1" size="2xlarge" :class="$style.title"> 404 - 页面未找到 </N8nHeading>

			<N8nText size="large" color="text-light" :class="$style.description">
				抱歉，您访问的页面不存在
			</N8nText>

			<div :class="$style.actions">
				<N8nButton type="primary" size="large" @click="handleBackToDashboard">
					返回仪表板
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
	color: var(--color--warning);
}

.title {
	margin-bottom: var(--spacing--md);
	color: var(--color--text);
}

.description {
	margin-bottom: var(--spacing--xl);
	display: block;
}

.actions {
	display: flex;
	gap: var(--spacing--sm);
	justify-content: center;
}
</style>
