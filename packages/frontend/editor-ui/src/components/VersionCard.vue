<script setup lang="ts">
import NodeIcon from './NodeIcon.vue';
import TimeAgo from './TimeAgo.vue';
import Badge from './Badge.vue';
import WarningTooltip from './WarningTooltip.vue';
import type { Version, VersionNode } from '@n8n/rest-api-client/api/versions';
import { useI18n } from '@n8n/i18n';

defineProps<{
	version: Version;
}>();

const i18n = useI18n();

const nodeName = (node: VersionNode): string => {
	return node !== null ? node.displayName : i18n.baseText('versionCard.unknown');
};
</script>

<template>
	<a
		v-if="version"
		:href="version.documentationUrl"
		target="_blank"
		:class="$style.card"
		data-test-id="version-card"
	>
		<div :class="$style.header">
			<div>
				<div :class="$style.name">
					{{ `${i18n.baseText('versionCard.version')} ${version.name}` }}
				</div>
				<WarningTooltip v-if="version.hasSecurityIssue">
					<span v-n8n-html="i18n.baseText('versionCard.thisVersionHasASecurityIssue')"></span>
				</WarningTooltip>
				<Badge
					v-if="version.hasSecurityFix"
					:text="i18n.baseText('versionCard.securityUpdate')"
					type="danger"
				/>
				<Badge
					v-if="version.hasBreakingChange"
					:text="i18n.baseText('versionCard.breakingChanges')"
					type="warning"
				/>
			</div>
			<div :class="$style['release-date']">
				{{ i18n.baseText('versionCard.released') }}&nbsp;<TimeAgo :date="version.createdAt" />
			</div>
		</div>
		<div
			v-if="version.description || (version.nodes && version.nodes.length)"
			:class="$style.divider"
		></div>
		<div>
			<div
				v-if="version.description"
				v-n8n-html="version.description"
				:class="$style.description"
			></div>
			<div v-if="version.nodes && version.nodes.length > 0" :class="$style.nodes">
				<NodeIcon
					v-for="node in version.nodes"
					:key="node.name"
					:node-type="node"
					:title="nodeName(node)"
				/>
			</div>
		</div>
	</a>
</template>

<style module lang="scss">
.card {
	background-color: $version-card-background-color;
	border: $version-card-border;
	border-radius: 8px;
	display: block;
	padding: 16px;
	text-decoration: none;

	&:hover {
		box-shadow: 0 2px 10px $version-card-box-shadow-color;
	}
}

.header {
	display: flex;
	flex-wrap: wrap;

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
	font-weight: var(--font-weight-bold);
	font-size: 16px;
	line-height: 18px;
	color: $version-card-name-text-color;
}

.divider {
	border-bottom: $version-card-border;
	width: 100%;
	margin: 10px 0 15px;
}

.description {
	font-size: 14px;
	font-weight: var(--font-weight-regular);
	line-height: 19px;
	color: $version-card-description-text-color;
}

.release-date {
	font-size: 12px;
	line-height: 18px;
	font-weight: var(--font-weight-regular);
	color: $version-card-release-date-text-color;
}

.nodes {
	display: grid;
	grid-template-columns: repeat(10, 1fr);
	grid-row-gap: 12px;
	margin-block-start: 24px;
}
</style>
