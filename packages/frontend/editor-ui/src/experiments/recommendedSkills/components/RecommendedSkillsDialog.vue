<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nDialog, N8nDialogBody, N8nText } from '@n8n/design-system';

import type { RecommendedSkillSelection } from '../recommendedSkills';
import RecommendedSkillCards from './RecommendedSkillCards.vue';

const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
	select: [recommended: RecommendedSkillSelection];
}>();

const i18n = useI18n();

function onSelect(recommended: RecommendedSkillSelection) {
	open.value = false;
	emit('select', recommended);
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="full"
		:container-class="$style.dialog"
		:header="i18n.baseText('experiments.recommendedSkills.dialog.title')"
		data-test-id="recommended-skills-dialog"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText tag="p" color="text-light">
				{{ i18n.baseText('experiments.recommendedSkills.description') }}
			</N8nText>
			<RecommendedSkillCards v-if="open" entry-point="create_menu" @select="onSelect" />
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
/* Wide enough to keep the "Based on" source of each card on one line. */
.dialog {
	--dialog--max-width: min(62rem, calc(100dvw - var(--spacing--lg)));
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
