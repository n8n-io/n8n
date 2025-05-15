<script setup lang="ts">
import { i18n } from '@/plugins/i18n';

import { N8nText, N8nLink } from '@n8n/design-system';

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
		@click="openCommunityNodeDocsPage"
		:class="$style.container"
		:title="i18n.baseText('communityNodesDocsLink.link.title')"
	>
		<N8nText size="small" bold style="margin-right: 5px">
			{{ i18n.baseText('communityNodesDocsLink.title') }}
		</N8nText>
		<FontAwesomeIcon icon="external-link-alt" />
	</N8nLink>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	margin-left: auto;
	padding-bottom: var(--spacing-5xs);
}
</style>
