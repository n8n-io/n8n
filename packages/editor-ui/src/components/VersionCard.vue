<template>
	<a :href="version.documentationUrl" target="_blank" :class="$style.card">
		<div :class="$style.header">
			<div>
				<div :class="$style.name">
					Version {{version.name}}
				</div>
				<WarningTooltip v-if="version.hasSecurityIssue">
					<template>
						This version has a security issue.<br/>It is listed here for completeness.
					</template>
				</WarningTooltip>
				<Badge
					v-if="version.hasSecurityFix"
					text="Security update"
					type="danger"
				/>
				<Badge
					v-if="version.hasSecurityFix"
					text="Breaking changes"
					type="warning"
				/>
			</div>
			<div :class="$style.released">
				Released&nbsp;<TimeAgo :date="version.createdAt" />
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
import NodeIcon from './NodeIcon.vue';
import TimeAgo from './TimeAgo.vue';
import Badge from './Badge.vue';
import WarningTooltip from './WarningTooltip.vue';


export default Vue.extend({
	components: { NodeIcon, TimeAgo, Badge, WarningTooltip },
	name: 'UpdatesPanel',
	props: ['version'],
});
</script>

<style module lang="scss">
	.card {
		background-color: $--version-card-background-color;
		border: $--version-card-border;
		border-radius: 8px;
		display: block;
		padding: 16px;
		text-decoration: none;

		&:hover {
			box-shadow: 0px 2px 10px $--version-card-box-shadow-color;
		}
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		border-bottom: $--version-card-border;
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
		color: $--version-card-name-text-color;
	}

	.description {
		font-size: 14px;
		font-weight: 400;
		line-height: 19px;
		color: $--version-card-description-text-color;
		margin-top: 15px;
	}

	.released {
		font-size: 12px;
		line-height: 18px;
		font-weight: 400;
		color: $--version-card-release-date-text-color;
	}

	.nodes {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		grid-row-gap: 12px;
		margin-block-start: 24px;
	}
</style>
