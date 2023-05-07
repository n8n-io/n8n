<template>
	<div :class="$style.cardContainer">
		<div v-if="loading" :class="$style.cardSkeleton">
			<n8n-loading :class="$style.loader" variant="p" :rows="1" />
			<n8n-loading :class="$style.loader" variant="p" :rows="1" />
		</div>
		<div v-else :class="$style.packageCard">
			<div :class="$style.cardInfoContainer">
				<div :class="$style.cardTitle">
					<n8n-text :bold="true" size="large">{{ communityPackage.packageName }}</n8n-text>
				</div>
				<div :class="$style.cardSubtitle">
					<n8n-text :bold="true" size="small" color="text-light">
						{{
							$locale.baseText('settings.communityNodes.packageNodes.label', {
								adjustToNumber: communityPackage.installedNodes.length,
							})
						}}:&nbsp;
					</n8n-text>
					<n8n-text size="small" color="text-light">
						<span v-for="(node, index) in communityPackage.installedNodes" :key="node.name">
							{{ node.name
							}}<span v-if="index != communityPackage.installedNodes.length - 1">,</span>
						</span>
					</n8n-text>
				</div>
			</div>
			<div :class="$style.cardControlsContainer">
				<n8n-text :bold="true" size="large" color="text-light">
					v{{ communityPackage.installedVersion }}
				</n8n-text>
				<n8n-tooltip v-if="communityPackage.failedLoading === true" placement="top">
					<template #content>
						<div>
							{{ $locale.baseText('settings.communityNodes.failedToLoad.tooltip') }}
						</div>
					</template>
					<n8n-icon icon="exclamation-triangle" color="danger" size="large" />
				</n8n-tooltip>
				<n8n-tooltip v-else-if="communityPackage.updateAvailable" placement="top">
					<template #content>
						<div>
							{{ $locale.baseText('settings.communityNodes.updateAvailable.tooltip') }}
						</div>
					</template>
					<n8n-button type="outline" label="Update" @click="onUpdateClick" />
				</n8n-tooltip>
				<n8n-tooltip v-else placement="top">
					<template #content>
						<div>
							{{ $locale.baseText('settings.communityNodes.upToDate.tooltip') }}
						</div>
					</template>
					<n8n-icon icon="check-circle" color="text-light" size="large" />
				</n8n-tooltip>
				<div :class="$style.cardActions">
					<n8n-action-toggle :actions="packageActions" @action="onAction"></n8n-action-toggle>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { useUIStore } from '@/stores/ui.store';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';
import { NPM_PACKAGE_DOCS_BASE_URL, COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '../constants';
import { showMessage } from '@/mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'CommunityPackageCard',
	props: {
		communityPackage: {
			type: Object as () => PublicInstalledPackage,
		},
		loading: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			packageActions: [
				{
					label: this.$locale.baseText('settings.communityNodes.viewDocsAction.label'),
					value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS,
					type: 'external-link',
				},
				{
					label: this.$locale.baseText('settings.communityNodes.uninstallAction.label'),
					value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
				},
			],
		};
	},
	computed: {
		...mapStores(useUIStore),
	},
	methods: {
		async onAction(value: string) {
			switch (value) {
				case COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS:
					this.$telemetry.track('user clicked to browse the cnr package documentation', {
						package_name: this.communityPackage.packageName,
						package_version: this.communityPackage.installedVersion,
					});
					window.open(`${NPM_PACKAGE_DOCS_BASE_URL}${this.communityPackage.packageName}`, '_blank');
					break;
				case COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL:
					this.uiStore.openCommunityPackageUninstallConfirmModal(this.communityPackage.packageName);
					break;
				default:
					break;
			}
		},
		onUpdateClick() {
			this.uiStore.openCommunityPackageUpdateConfirmModal(this.communityPackage.packageName);
		},
	},
});
</script>

<style lang="scss" module>
.cardContainer {
	display: flex;
	padding: var(--spacing-s);
	border: var(--border-width-base) var(--border-style-base) var(--color-info-tint-1);
	border-radius: var(--border-radius-large);
	background-color: var(--color-background-xlight);
}

.packageCard,
.cardSkeleton {
	display: flex;
	flex-basis: 100%;
	justify-content: space-between;
}

.packageCard {
	align-items: center;
}

.cardSkeleton {
	flex-direction: column;
}

.loader {
	width: 50%;
	transform: scaleY(-1);

	&:last-child {
		width: 70%;

		div {
			margin: 0;
		}
	}
}

.cardInfoContainer {
	display: flex;
	flex-wrap: wrap;
}

.cardTitle {
	flex-basis: 100%;

	span {
		line-height: 1;
	}
}

.cardSubtitle {
	margin-top: 2px;
	padding-right: var(--spacing-m);
}

.cardControlsContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.cardActions {
	padding-left: var(--spacing-3xs);
}
</style>
