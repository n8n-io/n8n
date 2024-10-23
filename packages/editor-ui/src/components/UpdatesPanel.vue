<script setup lang="ts">
import { computed } from 'vue';

import ModalDrawer from './ModalDrawer.vue';
import TimeAgo from './TimeAgo.vue';
import VersionCard from './VersionCard.vue';
import { VERSIONS_MODAL_KEY } from '../constants';
import { useVersionsStore } from '@/stores/versions.store';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';

const versionsStore = useVersionsStore();
const uiStore = useUIStore();

const i18n = useI18n();

const nextVersions = computed(() => versionsStore.nextVersions);

const currentVersion = computed(() => versionsStore.currentVersion);

const infoUrl = computed(() => versionsStore.infoUrl);

const onInfoUrlClick = async () => {
	uiStore.goToVersions();
};
</script>

<template>
	<ModalDrawer
		:name="VERSIONS_MODAL_KEY"
		direction="ltr"
		width="520px"
		data-test-id="version-updates-panel"
	>
		<template #header>
			<span :class="$style.title">
				{{ i18n.baseText('updatesPanel.weVeBeenBusy') }}
			</span>
		</template>
		<template #content>
			<section :class="$style['description']">
				<p v-if="currentVersion">
					{{
						i18n.baseText('updatesPanel.youReOnVersion', {
							interpolate: { currentVersionName: currentVersion.name },
						})
					}}
					<strong>
						<TimeAgo :date="currentVersion.createdAt" />
					</strong>
					{{ i18n.baseText('updatesPanel.andIs') }}
					<strong>
						{{
							i18n.baseText('updatesPanel.version', {
								interpolate: {
									numberOfVersions: nextVersions.length,
									howManySuffix: nextVersions.length > 1 ? 's' : '',
								},
							})
						}}
					</strong>
					{{ i18n.baseText('updatesPanel.behindTheLatest') }}
				</p>

				<n8n-button
					v-if="infoUrl"
					:text="true"
					type="primary"
					size="large"
					:class="$style['link']"
					:bold="true"
					@click="onInfoUrlClick"
				>
					<font-awesome-icon icon="info-circle" class="mr-2xs" />
					<span>
						{{ i18n.baseText('updatesPanel.howToUpdateYourN8nVersion') }}
					</span>
				</n8n-button>
			</section>
			<section :class="$style.versions">
				<div v-for="version in nextVersions" :key="version.name" :class="$style['versions-card']">
					<VersionCard :version="version" />
				</div>
			</section>
		</template>
	</ModalDrawer>
</template>

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

	.link {
		padding-left: 0px;
	}

	.link:hover {
		color: var(--prim-color-primary);
		text-decoration: none;
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
