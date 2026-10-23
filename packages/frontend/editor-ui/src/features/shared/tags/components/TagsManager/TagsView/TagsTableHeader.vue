<script setup lang="ts">
import { ref } from 'vue';
import { MAX_TAG_NAME_LENGTH } from '../../../tags.constants';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nIcon, N8nInput } from '@n8n/design-system';
withDefaults(
	defineProps<{
		disabled: boolean;
		search: string;
		canCreate?: boolean;
	}>(),
	{
		disabled: false,
		search: '',
		canCreate: true,
	},
);

const i18n = useI18n();

const emit = defineEmits<{
	searchChange: [value: string];
	createEnable: [];
}>();

const maxLength = ref(MAX_TAG_NAME_LENGTH);

const onAddNew = () => {
	emit('createEnable');
};

const onSearchChange = (search: string) => {
	emit('searchChange', search);
};
</script>

<template>
	<div :class="$style.header">
		<div :class="$style.search">
			<N8nInput
				:placeholder="i18n.baseText('tagsTableHeader.searchTags')"
				:model-value="search"
				:disabled="disabled"
				:maxlength="maxLength"
				clearable
				@update:model-value="onSearchChange"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
		</div>
		<N8nButton
			v-if="canCreate"
			:disabled="disabled"
			icon="plus"
			:label="i18n.baseText('tagsTableHeader.addNew')"
			size="large"
			@click="onAddNew"
		/>
	</div>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}

.search {
	flex: 1;
}
</style>
