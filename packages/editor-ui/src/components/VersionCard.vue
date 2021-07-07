<template>
	<a :href="version.documentationUrl" target="_blank" :class="$style.card">
		<div :class="$style.header">
			<div>
				<div :class="$style.name">
					Version {{version.name}}
				</div>
				<el-tooltip effect="light" content=" " placement="top" v-if="version.hasSecurityIssue">
					<div slot="content">This version has a security issue.<br/>It is listed here for completeness.</div>
					<font-awesome-icon :class="$style['security-flag']" icon="exclamation-triangle"></font-awesome-icon>
				</el-tooltip>
				<el-tag type="danger" v-if="version.hasSecurityFix" size="small" :class="`${$style['security-update']} ${$style['badge']}`">Security update</el-tag>
				<el-tag v-if="version.hasBreakingChange" size="small" :class="`${$style['breaking-change']} ${$style['badge']}`">Breaking changes</el-tag>
			</div>
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
	name: 'UpdatesPanel',
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

		&:hover {
			box-shadow: 0px 2px 10px rgba(109, 48, 40, 0.07);
		}
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		border-bottom: 1px solid #DBDFE7;
		padding-bottom: 10px;

		> * {
			display: flex;
			margin-bottom: 5px;
		}

		> div:first-child {
			flex-grow: 1;

			> * {
				margin-right: 5px;
			}
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
		font-weight: 400;
		line-height: 19px;
		color: #7D7D87;
		margin-top: 15px;
	}

	.released {
		font-size: 12px;
		line-height: 18px;
		color: #909399;
	}

	.nodes {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		grid-row-gap: 5px;
		margin-block-start: 15px;
	}

	.badge {
		font-size: 11px;
		line-height: 18px;
		max-height: 18px;
		font-weight: 400;
		display: flex;
		align-items: center;
		padding: 2px 4px;
	}

	.security-update {
		color: #f45959;
		background-color: #fef0f0;
		border-color: #fde2e2;
	}

	.breaking-change {
		background-color: rgba(255, 229, 100, 0.3);
		color: #6B5900;
		border: none;
	}

	.security-flag {
		font-size: 14px;
		height: 18px;
		color: #ff8080;
	}
</style>
