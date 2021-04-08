<template>
    <el-dialog title="Manage Tags" :visible.sync="visible">
        <el-row class="content">
            <el-row v-if="hasTags">
                <el-row class="tags-header">
                    <el-col :span="10">
                        <el-input placeholder="Search tags" ref="inputFieldFilter" v-model="searchText">
                            <i slot="prefix" class="el-input__icon el-icon-search"></i>
                        </el-input>
                    </el-col>
                    <el-col :span="14">
                        <el-button plain>Create new</el-button>
                    </el-col>
                </el-row>
                <TagsTable :tags="tags" :search="searchText"/>
            </el-row>
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
                <el-button>
                    Create a tag
                </el-button>
            </el-col>
        </el-row>
        <el-row class="footer">
            <el-button size="small">Done</el-button>
        </el-row>
    </el-dialog>
</template>

<script lang="ts">
import { ITag } from '@/Interface';
import Vue from 'vue';

import TagsTable from '@/components/TagsManagerTagsTable.vue';

export default Vue.extend({
	name: 'TagsManager',
	props: [
        'visible'
	],
    components: {
        TagsTable
    },
	computed: {
        data () {
            return {
                searchText: ''
            };
        },
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

.content {
    min-height: 300px;
}

.tags-header {
    margin-bottom: 15px;

    .el-button {
        float: right;
    }
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

.footer {
    padding-top: 15px;

    .el-button {
        float: right;
    }
}
</style>