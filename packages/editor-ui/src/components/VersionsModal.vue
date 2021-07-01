<template>
	<Modal
		:name="modalName"
		:drawer="true"
		drawerDirection="ltr"
		drawerWidth="480px"
	>
		<template slot="header">
			<p :class="$style.title"> We’ve been busy ✨</p>
		</template>
		<template slot="content">
			<section :class="$style['header-content']">
				<p>You’re on {{ currentVersion.name }}, which is <strong>{{currentReleaseDate}}</strong> and {{ nextVersions.length }} version{{nextVersions.length > 1 ? 's' : ''}} behind the latest and greatest n8n</p>	
				<a><font-awesome-icon icon="info-circle"></font-awesome-icon>How to update your n8n version</a>
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
	name: 'VersionsModal',
	components: {
		Modal,
		VersionCard,
	},
	props: ['modalName'],
	computed: {
		...mapGetters('versions', [
			'nextVersions',
			'currentVersion',
		]),
		currentReleaseDate() {
			return format(this.currentVersion.createdAt).replace('ago', 'old');
		},
	},
});
</script>

<style module lang="scss">
	.header-content {
		padding: 0px 30px;
		margin-bottom: 30px;

		p {
			font-size: 16px;
			line-height: 22px;
			color: #7D7D87;
		}

		div {
			padding-top: 20px;
		}
	}

	.title {
		margin: 0;
		font-size: 24px;
		line-height: 24px;
		color: #555555;
		font-weight: 400;
	}

	.versions {
		background-color: #F8F9FB;
		border-top: 1px #DBDFE7 solid;
		height: 100%;
		padding: 30px;
	}

	.versions-card {
		margin-bottom: 15px;
	}
</style>
