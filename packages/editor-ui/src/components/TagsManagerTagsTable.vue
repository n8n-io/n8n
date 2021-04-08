<template>
    <el-table :data="tags" :default-sort = "{prop: 'name', order: 'ascending'}" stripe max-height="450">
        <el-table-column property="name" label="Name"></el-table-column>
        <el-table-column property="usageCount" label="Usage">
            	<template slot-scope="scope">
                        <span v-if="scope.row.usageCount > 0">
						    {{scope.row.usageCount}} workflows
                        </span>
                        <span v-else>Not being used</span>
			    </template>
        </el-table-column>
        <el-table-column
            width="200">
            <template slot-scope="scope">
                <el-button title="Edit Credentials" size="small" plain>Edit</el-button>
                <el-button title="Delete Credentials" size="small" plain>Delete</el-button>
            </template>
        </el-table-column>
    </el-table>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'TagsTable',
	props: [
        'tags',
        'search'
	]
});
</script>

<style lang="scss" scoped>
tr {
    // todo: min-height for long tags
    height: 60px;

    .el-button {
        visibility: hidden;
        float: right;
        margin-left: 5px;
    }

    &:hover .el-button {
        visibility: visible;
    }
}
</style>