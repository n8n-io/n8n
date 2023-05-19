<template>
	<el-row class="tags-header">
		<el-col :span="10">
			<n8n-input
				:placeholder="$locale.baseText('tagsTableHeader.searchTags')"
				:value="search"
				@input="onSearchChange"
				:disabled="disabled"
				clearable
				:maxlength="maxLength"
			>
				<template #prefix>
					<font-awesome-icon icon="search" />
				</template>
			</n8n-input>
		</el-col>
		<el-col :span="14">
			<n8n-button
				@click="onAddNew"
				:disabled="disabled"
				icon="plus"
				:label="$locale.baseText('tagsTableHeader.addNew')"
				size="large"
				float="right"
			/>
		</el-col>
	</el-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { MAX_TAG_NAME_LENGTH } from '@/constants';

export default defineComponent({
	props: {
		disabled: {
			default: false,
		},
		search: {
			default: '',
		},
	},
	data() {
		return {
			maxLength: MAX_TAG_NAME_LENGTH,
		};
	},
	methods: {
		onAddNew() {
			this.$emit('createEnable');
		},
		onSearchChange(search: string) {
			this.$emit('searchChange', search);
		},
	},
});
</script>

<style lang="scss" scoped>
.tags-header {
	margin-bottom: 15px;
}
</style>
