<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nLink } from '@n8n/design-system';
import NDVEmptyState from './NDVEmptyState.vue';
import { I18nT } from 'vue-i18n';

defineProps<{
	title: string;
	isDynamicCredentials: boolean;
	canReveal: boolean;
}>();

const emit = defineEmits<{
	openSettings: [];
	reveal: [];
}>();

const i18n = useI18n();
</script>

<template>
	<NDVEmptyState icon="lock" :title="title" data-test-id="ndv-data-redacted">
		<template v-if="isDynamicCredentials">
			{{ i18n.baseText('ndv.redacted.dynamicCredentials.description') }}
		</template>
		<template v-else>
			<I18nT keypath="ndv.redacted.description" tag="span" scope="global">
				<template #link>
					<N8nLink size="small" style="white-space: nowrap" @click="emit('openSettings')">{{
						i18n.baseText('ndv.redacted.description.link')
					}}</N8nLink>
				</template>
			</I18nT>
		</template>
		<template v-if="canReveal" #actions>
			<N8nButton
				:label="i18n.baseText('ndv.redacted.revealButton')"
				variant="outline"
				size="small"
				data-test-id="ndv-reveal-redacted-data"
				@click="emit('reveal')"
			/>
		</template>
	</NDVEmptyState>
</template>
