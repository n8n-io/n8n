<script setup lang="ts">
import { computed } from 'vue';
import type { IDataObject } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import { isUnprofiledField, useDataProfiling } from '../composables/useDataProfiling';
import ProfileFieldCard from './ProfileFieldCard.vue';
import ProfileLocationCard from './ProfileLocationCard.vue';

const props = defineProps<{
	jsonData: IDataObject[];
}>();

const i18n = useI18n();
const { profileItems } = useDataProfiling();

const profile = computed(() => profileItems(props.jsonData));
const visualizedFields = computed(() =>
	profile.value.fields.filter((field) => !isUnprofiledField(field)),
);
const skippedFields = computed(() => profile.value.fields.filter(isUnprofiledField));
const skippedFieldsSummary = computed(() =>
	skippedFields.value.map((field) => `${field.path} (${field.stats.distinctCount})`).join(', '),
);
</script>

<template>
	<div :class="$style.profile">
		<N8nText v-if="profile.capped" size="small" color="text-light" :class="$style.cappedNotice">
			{{
				i18n.baseText('runData.profile.cappedNotice', {
					interpolate: { profiled: profile.itemsProfiled, total: profile.itemsTotal },
				})
			}}
		</N8nText>

		<N8nText v-if="!profile.fields.length && !profile.location" color="text-light">
			{{ i18n.baseText('runData.profile.emptyState') }}
		</N8nText>

		<ProfileLocationCard v-if="profile.location" :location="profile.location" />

		<ProfileFieldCard v-for="field in visualizedFields" :key="field.path" :field="field" />

		<N8nText
			v-if="skippedFields.length"
			size="small"
			color="text-light"
			:class="$style.skippedNote"
		>
			{{ i18n.baseText('runData.profile.highCardinalityNote') }}
			{{ skippedFieldsSummary }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.profile {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	overflow-y: auto;
	height: 100%;
}

.cappedNotice {
	align-self: flex-start;
}

.skippedNote {
	border-top: var(--border);
	padding-top: var(--spacing--xs);
}
</style>
