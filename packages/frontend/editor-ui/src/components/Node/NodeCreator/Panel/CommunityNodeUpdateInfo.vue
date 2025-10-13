<script setup lang="ts">
import { useUIStore } from '@/stores/ui.store';
import { i18n } from '@n8n/i18n';

import { N8nButton, N8nCallout } from '@n8n/design-system';
interface Props {
	packageName?: string;
	source?: string;
}

const props = defineProps<Props>();

const { openCommunityPackageUpdateConfirmModal } = useUIStore();

const onUpdate = () => {
	if (!props.packageName) return;
	openCommunityPackageUpdateConfirmModal(props.packageName, props.source);
};
</script>

<template>
	<N8nCallout theme="secondary" :iconless="true" style="margin-bottom: var(--spacing--sm)">
		{{ i18n.baseText('communityNodeUpdateInfo.available') }}
		<template v-if="props.packageName" #trailingContent>
			<N8nButton type="secondary" @click="onUpdate">
				{{ i18n.baseText('generic.update') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>
