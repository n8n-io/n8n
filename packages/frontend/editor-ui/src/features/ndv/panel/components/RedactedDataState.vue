<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nLink } from '@n8n/design-system';
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
	<NDVEmptyState :class="$style.root" :title="title" data-test-id="ndv-data-redacted">
		<template #icon>
			<N8nIcon icon="shredder" size="xxlarge" color="text-light" />
		</template>
		<template v-if="isDynamicCredentials">
			{{ i18n.baseText('ndv.redacted.dynamicCredentials.description') }}
		</template>
		<template v-else>
			{{ i18n.baseText('ndv.redacted.description.sentence1') }}<br />
			<I18nT keypath="ndv.redacted.description.sentence2" tag="span" scope="global">
				<template #link>
					<N8nLink size="medium" style="white-space: nowrap" @click="emit('openSettings')">{{
						i18n.baseText('ndv.redacted.description.link')
					}}</N8nLink>
				</template>
			</I18nT>
		</template>
		<template v-if="canReveal" #actions>
			<N8nButton
				:label="i18n.baseText('ndv.redacted.revealButton')"
				variant="outline"
				size="medium"
				data-test-id="ndv-reveal-redacted-data"
				@click="emit('reveal')"
			/>
		</template>
	</NDVEmptyState>
</template>

<style lang="css" module>
.root p {
	max-width: 300px;
}
</style>
