<template>
	<el-row class="tags-header">
		<el-col :span="10">
			<n8n-input
				:placeholder="$i18n2.baseText('tagsTableHeader.searchTags')"
				:value="search"
				@input="onSearchChange"
				:disabled="disabled"
				clearable
				:maxlength="maxLength"
			>
				<font-awesome-icon slot="prefix" icon="search" />
			</n8n-input>
		</el-col>
		<el-col :span="14">
			<n8n-button @click="onAddNew" :disabled="disabled" icon="plus" :label="$i18n2.baseText('tagsTableHeader.addNew')" size="large" float="right" />
		</el-col>
	</el-row>
</template>

<script lang="ts">
import { renderText } from "@/components/mixins/renderText";
import { MAX_TAG_NAME_LENGTH } from "@/constants";
import Vue from "vue";
import mixins from 'vue-typed-mixins';

export default mixins(renderText).extend({
	props: {
		disabled: {
			default: false,
		},
		search: {
			default: "",
		},
	},
	data() {
		return {
			maxLength: MAX_TAG_NAME_LENGTH,
		};
	},
	methods: {
		onAddNew() {
			this.$emit("createEnable");
		},
		onSearchChange(search: string) {
			this.$emit("searchChange", search);
		},
	},
});
</script>

<style lang="scss" scoped>
.tags-header {
	margin-bottom: 15px;
}
</style>
