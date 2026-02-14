<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nCanvasPill from '../CanvasPill';
import N8nAvatar from '../N8nAvatar';

defineOptions({
	name: 'N8nCanvasCollaborationPill',
});

const props = defineProps<{
	firstName: string;
	lastName?: string;
}>();

const { t } = useI18n();

const userName = computed(() => {
	return props.lastName ? `${props.firstName} ${props.lastName}` : props.firstName;
});
</script>

<template>
	<N8nCanvasPill>
		<template #icon>
			<N8nAvatar :first-name="firstName" :last-name="lastName" size="small" />
		</template>
		{{ t('collaboration.canvas.editing', { user: userName }) }}
	</N8nCanvasPill>
</template>
