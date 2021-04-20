<template>
    <div class="tags-container">
        <el-tag 
            v-for="tag in toDisplay" 
            :key="tag.id"
            type="info"
            size="small"
        >
            {{tag.name}}
        </el-tag>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'TagContainer',
	props: [
        "tags"
    ],
    computed: {
        toDisplay() {
            const tags = this.$props.tags || []; 

            const toDisplay = tags.slice(0, 2);
            if (tags.length > 2) {
                toDisplay.push({
                    id: 'count',
                    name: `+${tags.length - 2}`
                });
            }

            return toDisplay;
        },
    },
});
</script>

<style lang="scss" scoped>
    .tags-container .el-tag {
        margin-right: 4px;
    }
</style>
