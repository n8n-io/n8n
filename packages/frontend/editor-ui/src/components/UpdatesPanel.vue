<script setup lang="ts">
import ModalDrawer from './ModalDrawer.vue';
import TimeAgo from './TimeAgo.vue';
import VersionCard from './VersionCard.vue';
import { VERSIONS_MODAL_KEY } from '../constants';
import { useVersionsStore } from '@/stores/versions.store';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

const versionsStore = useVersionsStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const i18n = useI18n();
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
				<p v-if="versionsStore.currentVersion">
					{{
						i18n.baseText('updatesPanel.youReOnVersion', {
							interpolate: { currentVersionName: versionsStore.currentVersion.name },
						})
					}}
					<strong>
						<TimeAgo :date="versionsStore.currentVersion.createdAt" />
					</strong>
					{{ i18n.baseText('updatesPanel.andIs') }}
					<strong>
						{{
							i18n.baseText('updatesPanel.version', {
								interpolate: {
									numberOfVersions: versionsStore.nextVersions.length,
									howManySuffix: versionsStore.nextVersions.length > 1 ? 's' : '',
								},
							})
						}}
					</strong>
					{{ i18n.baseText('updatesPanel.behindTheLatest') }}
				</p>

				<n8n-button
					v-if="versionsStore.infoUrl"
					:text="true"
					type="primary"
					size="large"
					:class="$style['link']"
					:bold="true"
					@click="pageRedirectionHelper.goToVersions()"
				>
					<n8n-icon icon="info" class="mr-2xs" />
					<span>
						{{ i18n.baseText('updatesPanel.howToUpdateYourN8nVersion') }}
					</span>
				</n8n-button>
			</section>
			<section :class="$style.versions">
				<div
					v-for="version in versionsStore.nextVersions"
					:key="version.name"
					:class="$style['versions-card']"
				>
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
	font-weight: var(--font-weight-regular);
}

.description {
	padding: 0px 30px;
	margin-block-start: 16px;
	margin-block-end: 30px;

	p {
		font-size: 16px;
		line-height: 22px;
		color: $updates-panel-description-text-color;
		font-weight: var(--font-weight-regular);
		margin: 0 0 16px 0;
	}

	div {
		padding-top: 20px;
	}

	.link {
		padding-left: 0px;
		display: flex;
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
