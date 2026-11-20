<script lang="ts" setup>
import { I18nT } from 'vue-i18n';
import { N8nLink, N8nText } from '@n8n/design-system';

import type { RecommendedSkill } from '../recommendedSkills';

defineProps<{ skill?: RecommendedSkill }>();
</script>

<template>
	<N8nText
		v-if="skill"
		tag="p"
		size="small"
		color="text-light"
		:class="$style.source"
		data-test-id="recommended-skill-source"
	>
		<I18nT keypath="experiments.recommendedSkills.basedOn" scope="global" tag="span">
			<template #source>
				<N8nLink
					:to="skill.source.url"
					new-window
					rel="noopener noreferrer"
					theme="text"
					size="small"
					data-test-id="recommended-skill-source-link"
					:data-attr="`recommended-skill-source-${skill.id}`"
					>{{ skill.source.label }}</N8nLink
				>
			</template>
		</I18nT>
	</N8nText>
</template>

<style lang="scss" module>
.source {
	overflow-wrap: anywhere;
}
</style>
