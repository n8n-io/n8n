<script setup lang="ts">
import { ref } from 'vue';
import { MAX_TAG_NAME_LENGTH } from '@/constants';
import { useI18n } from '@n8n/i18n';

import { ElCol, ElRow } from 'element-plus';
import { N8nButton, N8nIcon, N8nInput } from '@n8n/design-system';
withDefaults(
	defineProps<{
		disabled: boolean;
		search: string;
	}>(),
	{
		disabled: false,
		search: '',
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
	<ElRow class="tags-header">
		<ElCol :span="10">
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
		</ElCol>
		<ElCol :span="14">
			<N8nButton
				:disabled="disabled"
				icon="plus"
				:label="i18n.baseText('tagsTableHeader.addNew')"
				size="large"
				float="right"
				@click="onAddNew"
			/>
		</ElCol>
	</ElRow>
</template>

<style lang="scss" scoped>
.tags-header {
	margin-bottom: 15px;
}
</style>
