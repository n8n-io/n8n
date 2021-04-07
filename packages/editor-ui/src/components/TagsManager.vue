<template>
    <el-dialog title="Manage Tags" :visible.sync="visible">
        <div v-if="hasTags">
            {{tags}}
        </div>
        <div v-else>
            <div>
            🗄️
            </div>
            <div>
                Ready to organize your workflows?
            </div>
            <div>
                With workflow tags, you're free to create the perfect tagging system for your flows
            </div>
            <el-button type="success">
            Create a tag
            </el-button>
        </div>
        <div>
            <el-button type="success">Done</el-button>
        </div>
    </el-dialog>
</template>

<script lang="ts">
import { ITag } from '@/Interface';
import Vue from 'vue';

export default Vue.extend({
	name: 'TagsManager',
	props: [
        'visible'
	],
	computed: {
        tags(): ITag[] {
            return this.$store.getters['tags/allTags']
        },
        hasTags(): boolean {
            console.log(this.$store.getters['tags/allTags']);
            return this.$store.getters['tags/allTags'].length > 0;
        }
    }
});
</script>


<style scoped lang="scss">
/deep/ .el-dialog {
    min-height: 400px;
    max-width: 600px;
}
</style>