<template>
    <el-dialog title="Manage Tags" :visible.sync="visible">
        <el-row>
            <el-col v-if="hasTags" :span="24">
                {{tags}}
            </el-col>
            <el-col class="notags" :span="16" :offset="4" v-else>
                <div class="icon">
                🗄️
                </div>
                <div>
                    <div class="headline">
                        Ready to organize your workflows?
                    </div>
                    <div class="description">
                        With workflow tags, you're free to create the perfect tagging system for your flows
                    </div>
                </div>
                <el-button type="success">
                    Create a tag
                </el-button>
            </el-col>
        </el-row>
        <el-row>
            <el-button type="success" size="small">Done</el-button>
        </el-row>
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
* {
    box-sizing: border-box;
}

/deep/ .el-dialog {
    max-width: 600px;
}

.el-row:first-of-type {
    min-height: 300px;
}

.notags {
    word-break: normal;
    text-align: center;
    padding-top: 32px;

    > * {
        margin-bottom: 32px;
    }

    .icon {
        font-size: 36px;
        line-height: 14px;
    }

    .headline {
        font-size: 17.6px;
        color: black;
        margin-bottom: 12px;
    }

    .description {
        font-size: 14px;
        line-height: 21px;
    }
}

.el-row:last-of-type {
    .el-button {
        float: right;
    }
}
</style>