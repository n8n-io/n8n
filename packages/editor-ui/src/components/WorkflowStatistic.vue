<script setup lang="ts"></script>

<template>
	<n8n-tooltip placement="top">
		<div class="statusText">
			<n8n-icon icon="play-circle" color="info" />
			<n8n-text color="text-base" size="small" bold> 40 | </n8n-text>
			<n8n-icon icon="check-circle" color="success" />
			<n8n-text color="text-base" size="small" bold> 26 | </n8n-text>
			<n8n-icon icon="exclamation-triangle" color="danger" />
			<n8n-text color="text-base" size="small" bold> 14 </n8n-text>
		</div>
		<template #content> statistic details </template>
	</n8n-tooltip>
</template>

<style lang="scss" scoped>
.statusText {
	padding-right: var(--spacing-s);
	box-sizing: border-box;
	display: inline-block;
	text-align: right;
}

.icon {
	font-size: var(--font-size-2xs);
	width: 12px;
}
</style>
