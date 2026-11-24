<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedGenericPreview } from './wouldHaveHappened.types';
import { presentText, previewEntries } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedGenericPreview;
}>();

const i18n = useI18n();

const heading = computed(
	() =>
		presentText(props.preview.toolName)?.trim() ??
		i18n.baseText('agents.testRun.preview.kind.generic'),
);
const entries = computed(() => previewEntries(props.preview.input));
</script>

<template>
	<WouldHaveHappenedCard
		:preview="preview"
		:heading="heading"
		icon="wrench"
		:empty="entries.length === 0"
		:empty-text="i18n.baseText('agents.testRun.preview.noInput')"
	>
		<dl :class="$style.fields">
			<WouldHaveHappenedField v-for="entry in entries" :key="entry.key" :label="entry.key">
				<WouldHaveHappenedText
					:text="entry.value"
					:monospace="entry.value.includes('\n')"
					:max-chars="200"
					:max-lines="4"
				/>
			</WouldHaveHappenedField>
		</dl>
	</WouldHaveHappenedCard>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
}
</style>
