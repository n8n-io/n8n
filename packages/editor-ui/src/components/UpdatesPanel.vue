<template>
	<ModalDrawer :name="VERSIONS_MODAL_KEY" direction="ltr" width="520px">
		<template #header>
			<span :class="$style.title">
				{{ $locale.baseText('updatesPanel.weVeBeenBusy') }}
			</span>
		</template>
		<template #content>
			<section :class="$style['description']">
				<p v-if="currentVersion">
					{{
						$locale.baseText('updatesPanel.youReOnVersion', {
							interpolate: { currentVersionName: currentVersion.name },
						})
					}}
					<strong><TimeAgo :date="currentVersion.createdAt" /></strong
					>{{ $locale.baseText('updatesPanel.andIs') }}
					<strong>{{
						$locale.baseText('updatesPanel.version', {
							interpolate: {
								numberOfVersions: nextVersions.length,
								howManySuffix: nextVersions.length > 1 ? 's' : '',
							},
						})
					}}</strong>
					{{ $locale.baseText('updatesPanel.behindTheLatest') }}
				</p>

				<n8n-link v-if="infoUrl" :to="infoUrl" :bold="true">
					<font-awesome-icon icon="info-circle"></font-awesome-icon>
					<span>
						{{ $locale.baseText('updatesPanel.howToUpdateYourN8nVersion') }}
					</span>
				</n8n-link>
			</section>
			<section :class="$style.versions">
				<div v-for="version in nextVersions" :key="version.name" :class="$style['versions-card']">
					<VersionCard :version="version" />
				</div>
			</section>
		</template>
	</ModalDrawer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ModalDrawer from './ModalDrawer.vue';
import TimeAgo from './TimeAgo.vue';
import VersionCard from './VersionCard.vue';
import { VERSIONS_MODAL_KEY } from '../constants';
import { mapStores } from 'pinia';
import { useVersionsStore } from '@/stores/versions';
import { IVersion } from '@/Interface';

export default defineComponent({
	name: 'UpdatesPanel',
	components: {
		ModalDrawer,
		VersionCard,
		TimeAgo,
	},
	computed: {
		...mapStores(useVersionsStore),
		nextVersions(): IVersion[] {
			return this.versionsStore.nextVersions;
		},
		currentVersion(): IVersion | undefined {
			return this.versionsStore.currentVersion;
		},
		infoUrl(): string {
			return this.versionsStore.infoUrl;
		},
	},
	data() {
		return {
			VERSIONS_MODAL_KEY,
		};
	},
});
</script>

<style module lang="scss">
.title {
	margin: 0;
	font-size: 24px;
	line-height: 24px;
	color: $updates-panel-text-color;
	font-weight: 400;
}

.description {
	padding: 0px 30px;
	margin-block-start: 16px;
	margin-block-end: 30px;

	p {
		font-size: 16px;
		line-height: 22px;
		color: $updates-panel-description-text-color;
		font-weight: 400;
		margin: 0 0 16px 0;
	}

	div {
		padding-top: 20px;
	}
}

.versions {
	background-color: $updates-panel-dark-background-color;
	border-top: $updates-panel-border;
	height: 100%;
	padding: 30px;
	overflow-y: scroll;
	padding-bottom: 220px;
}

.versions-card {
	margin-block-end: 15px;
}
</style>
