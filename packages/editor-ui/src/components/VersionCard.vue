<template>
	<a :href="version.documentationUrl" target="_blank" :class="$style.card">
		<div :class="$style.header">
			<div :class="$style.name">
				Version {{version.name}}
			</div>
			<el-tag type="danger" v-if="version.hasSecurityFix" size="small" :class="$style['security-update']">Security Update</el-tag>
			<el-tag v-if="version.hasBreakingChange" size="small" :class="$style['breaking-change']">Breaking Change</el-tag>
			<div :class="$style.released">
				Released {{releaseDate}}
			</div>
		</div>
		<div>
			<div v-html="version.description" :class="$style.description"></div>
			<div :class="$style.nodes" v-if="version.nodes && version.nodes.length > 0">
				<NodeIcon 
					v-for="node in version.nodes"
					:key="node.name"
					:nodeType="node"
				/>
			</div>
		</div>
	</a>
</template>

<script lang="ts">
import Vue from 'vue';
import { format } from 'timeago.js';
import NodeIcon from './NodeIcon.vue';


export default Vue.extend({
	components: { NodeIcon },
	name: 'VersionsModal',
	props: ['version'],
	computed: {
		releaseDate() {
			return format(this.version.createdAt);
		},
	},
});
</script>

<style module lang="scss">
	.card {
		background-color: #fff;
		border: 1px #DBDFE7 solid;
		border-radius: 8px;
		display: block;
		padding: 15px;
		text-decoration: none;
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		border-bottom: 1px solid #DBDFE7;
		padding-bottom: 10px;

		> * {
			margin-right: 5px;
			margin-bottom: 5px;
		}
	}

	.name {
		font-weight: 600;
		font-size: 16px;
		line-height: 18px;
		color: #666666;
	}

	.description {
		font-size: 14px;
		line-height: 19px;
		color: #7D7D87;
		margin-top: 15px;
	}

	.released {
		flex-grow: 1;
		font-size: 12px;
		line-height: 18px;
		color: #909399;
		text-align: right;
	}

	.nodes {
		display: flex;
		margin-top: 20px;
	}

	.security-update {
		line-height: 18px;
		max-height: 18px;
	}

	.breaking-change {
		background-color: rgba(255, 229, 100, 0.3);
		color: #6B5900;
		border: none;
		font-size: 11px;
		line-height: 18px;
		max-height: 18px;
		font-weight: 400;
		display: flex;
		align-items: center;
	}
</style>
