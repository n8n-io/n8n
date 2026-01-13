<script setup lang="ts">
import { i18n } from '@n8n/i18n';

import { N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
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
	<N8nLink
		theme="text"
		:class="$style.container"
		:title="i18n.baseText('communityNodesDocsLink.link.title')"
		@click="openCommunityNodeDocsPage"
	>
		<N8nText size="small" bold style="margin-right: 5px">
			{{ i18n.baseText('communityNodesDocsLink.title') }}
		</N8nText>
		<N8nIcon icon="external-link" />
	</N8nLink>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	margin-left: auto;
	padding-bottom: var(--spacing--5xs);
}
</style>
