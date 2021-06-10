<template>
	<el-row class="tags-header">
		<el-col :span="10">
			<el-input
				:placeholder="$translateBase('tagsTableHeader.searchTags')"
				:value="search"
				@input="onSearchChange"
				:disabled="disabled"
				clearable
				:maxlength="maxLength"
			>
				<i slot="prefix" class="el-input__icon el-icon-search"></i>
			</el-input>
		</el-col>
		<el-col :span="14">
			<el-button @click="onAddNew" :disabled="disabled" plain>
				<font-awesome-icon icon="plus" />
				<div class="next-icon-text">{{ $translateBase('tagsTableHeader.addNew') }}</div>
			</el-button>
		</el-col>
	</el-row>
</template>

<script lang="ts">
import { MAX_TAG_NAME_LENGTH } from "@/constants";
import Vue from "vue";
import mixins from 'vue-typed-mixins';
import { translate } from '@/components/mixins/translate';

export default mixins(translate).extend({
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

.el-button {
	float: right;
}
</style>
