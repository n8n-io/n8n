<template>
    <el-dialog title="Manage Tags" :visible.sync="visible">
        <div v-if="hasTags">
            {{tags}}
        </div>
        <div class="notags" v-else>
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
        </div>
        <div>
            <el-button type="success" size="small" class="done">Done</el-button>
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
    display: flex;
    flex-direction: column;

    .el-dialog__body {
        flex-grow: 1;
        display: flex;
        flex-direction: column;

        :first-child {
            flex-grow: 1;
        }
    }
}

.notags {
    word-break: normal;
    text-align: center;
    padding: 32px 25% 0 25%;

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

.done {
    float: right;
}
</style>