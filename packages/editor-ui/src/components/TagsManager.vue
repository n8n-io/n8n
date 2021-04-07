<template>
    <el-dialog title="Manage Tags" :visible.sync="visible">
        🗄️
    </el-dialog>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'TagsManager',
	props: [
        'visible'
	],
	computed: {
    }
});
</script>


<style scoped lang="scss">
/deep/ .el-dialog {
    max-width: 600px;
}
</style>