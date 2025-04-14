<script setup lang="ts">
export interface Props {
	packageName: string;
}

const props = defineProps<Props>();

const openCommunityNodeDocsPage = () => {
	const newTab = window.open(`https://www.npmjs.com/package/${props.packageName}`, '_blank');
	if (newTab) newTab.opener = null;
};
</script>

<template>
	<n8n-link
		theme="text"
		@click="openCommunityNodeDocsPage"
		:class="$style.container"
		:title="'Open community node docs'"
	>
		<n8n-text size="small" bold style="margin-right: 5px"> Docs </n8n-text>
		<font-awesome-icon icon="external-link-alt" />
	</n8n-link>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	margin-left: auto;
	padding-bottom: var(--spacing-5xs);
}
</style>
