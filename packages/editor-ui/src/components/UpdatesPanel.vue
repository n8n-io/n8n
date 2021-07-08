<template>
	<Modal
		:name="modalName"
		:drawer="true"
		:visible="visible"
		drawerDirection="ltr"
		drawerWidth="520px"
	>
		<template slot="header">
			<p :class="$style.title"> We’ve been busy ✨</p>
		</template>
		<template slot="content">
			<section :class="$style['description']">
				<p v-if="currentVersion">You’re on {{ currentVersion.name }}, which was released <strong>{{currentReleaseDate}}</strong> and is {{ nextVersions.length }} version{{nextVersions.length > 1 ? 's' : ''}} behind the latest and greatest n8n</p>	

				<a :class="$style.update" :href="infoUrl" v-if="infoUrl" target="_blank">
					<font-awesome-icon icon="info-circle"></font-awesome-icon>
					<span>How to update your n8n version</span>
				</a>
			</section>
			<section :class="$style.versions">
				<VersionCard 
					v-for="version in nextVersions"
					:key="version.name"
					:version="version"
					:class="$style['versions-card']"
				/>
			</section>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import { format } from 'timeago.js';

import Modal from './Modal.vue';
import VersionCard from './VersionCard.vue';

export default Vue.extend({
	name: 'UpdatesPanel',
	components: {
		Modal,
		VersionCard,
	},
	props: ['modalName', 'visible'],
	computed: {
		...mapGetters('versions', [
			'nextVersions',
			'currentVersion',
			'infoUrl',
		]),
		currentReleaseDate() {
			return format(this.currentVersion.createdAt);
		},
	},
});
</script>

<style module lang="scss">
	.title {
		margin: 0;
		font-size: 24px;
		line-height: 24px;
		color: $--updates-panel-text-color;
		font-weight: 400;
	}

	.description {
		padding: 0px 30px;
		margin-block-start: 16px;
		margin-block-end: 30px;

		p {
			font-size: 16px;
			line-height: 22px;
			color: $--updates-panel-description-text-color;
			font-weight: 400;
			margin: 0 0 16px 0;
		}

		div {
			padding-top: 20px;
		}
	}

	.content {
		overflow: hidden;
	}

	.versions {
		background-color: $--updates-panel-dark-background-color;
		border-top: $--updates-panel-border;
		height: 100%;
		padding: 30px;
		overflow-y: scroll;
		padding-bottom: 220px;
	}

	.versions-card {
		margin-block-end: 15px;
	}

	.update {
		text-decoration: none;
		font-size: 14px;

		svg {
			color: $--updates-panel-info-icon-color;
			margin-right: 5px;
		}

		span {
			color: $--updates-panel-info-url-color;
			font-weight: 600;
		}
	}
</style>
