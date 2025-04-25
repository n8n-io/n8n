<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useViewStacks } from '../composables/useViewStacks';
import { useUsersStore } from '@/stores/users.store';
import { i18n } from '@/plugins/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';

const { activeViewStack } = useViewStacks();

const { communityNodeDetails } = activeViewStack;

interface DownloadData {
	downloads: Array<{ downloads: number }>;
}

const publisherName = ref<string | undefined>(undefined);
const downloads = ref<string | null>(null);
const verified = ref(false);
const communityNodesStore = useCommunityNodesStore();
const nodeTypesStore = useNodeTypesStore();

const isOwner = computed(() => useUsersStore().isInstanceOwner);

const ownerEmailList = computed(() =>
	useUsersStore()
		.allUsers.filter((user) => user.role?.includes('owner'))
		.map((user) => user.email),
);

const formatNumber = (number: number) => {
	if (!number) return null;
	return new Intl.NumberFormat('en-US').format(number);
};

async function fetchPackageInfo(packageName: string) {
	const communityNodeAttributes = await nodeTypesStore.getCommunityNodeAttributes(
		activeViewStack.communityNodeDetails?.key || '',
	);

	if (communityNodeAttributes) {
		publisherName.value = communityNodeAttributes.authorName;
		downloads.value = formatNumber(communityNodeAttributes.numberOfDownloads);
		const packageInfo = communityNodesStore.getInstalledPackages.find(
			(p) => p.packageName === communityNodeAttributes.packageName,
		);
		if (!packageInfo) {
			verified.value = true;
		} else {
			verified.value = packageInfo.installedVersion === communityNodeAttributes.npmVersion;
		}

		return;
	}

	const url = `https://registry.npmjs.org/${packageName}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			console.log('Could not get metadata for package', packageName);
			return;
		}

		const data = await response.json();
		const publisher = data.maintainers?.[0]?.name as string | undefined;
		publisherName.value = publisher;

		const today = new Date().toISOString().split('T')[0];
		const downloadsUrl = `https://api.npmjs.org/downloads/range/2022-01-01:${today}/${packageName}`;

		const downloadsResponse = await fetch(downloadsUrl);

		if (!downloadsResponse.ok) {
			console.log('Could not get downloads for package', packageName);
			return;
		}

		const downloadsData: DownloadData = await downloadsResponse.json();
		if (!downloadsData.downloads || !downloadsData.downloads.length) return;

		const total = downloadsData.downloads.reduce((sum, day) => sum + day.downloads, 0);

		downloads.value = formatNumber(total);
	} catch (error) {
		console.error(error);
	}
}

onMounted(async () => {
	if (communityNodeDetails?.packageName) {
		await fetchPackageInfo(communityNodeDetails.packageName);
	}
});
</script>

<template>
	<div :class="$style.container">
		<n8n-text :class="$style.description" color="text-base" size="medium">
			{{ communityNodeDetails?.description }}
		</n8n-text>
		<div :class="$style.separator"></div>
		<div :class="$style.info">
			<n8n-tooltip placement="top" v-if="verified">
				<template #content>{{ i18n.baseText('communityNodeInfo.approved') }}</template>
				<div>
					<FontAwesomeIcon :class="$style.tooltipIcon" icon="check-circle" />
					<n8n-text color="text-light" size="xsmall" bold data-test-id="verified-tag">
						{{ i18n.baseText('communityNodeInfo.approved.label') }}
					</n8n-text>
				</div>
			</n8n-tooltip>

			<n8n-tooltip placement="top" v-else>
				<template #content>{{ i18n.baseText('communityNodeInfo.unverified') }}</template>
				<div>
					<FontAwesomeIcon :class="$style.tooltipIcon" icon="cube" />
					<n8n-text color="text-light" size="xsmall" bold>
						{{ i18n.baseText('communityNodeInfo.unverified.label') }}
					</n8n-text>
				</div>
			</n8n-tooltip>

			<div v-if="downloads">
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="download" />
				<n8n-text color="text-light" size="xsmall" bold data-test-id="number-of-downloads">
					{{ i18n.baseText('communityNodeInfo.downloads', { interpolate: { downloads } }) }}
				</n8n-text>
			</div>

			<div v-if="publisherName">
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="user" />
				<n8n-text color="text-light" size="xsmall" bold data-test-id="publisher-name">
					{{ i18n.baseText('communityNodeInfo.publishedBy', { interpolate: { publisherName } }) }}
				</n8n-text>
			</div>
		</div>
		<div v-if="!isOwner && !communityNodeDetails?.installed" :class="$style.contactOwnerHint">
			<n8n-icon color="text-light" icon="info-circle" size="large" />
			<n8n-text color="text-base" size="medium">
				<div style="padding-bottom: 8px">
					{{ i18n.baseText('communityNodeInfo.contact.admin') }}
				</div>
				<n8n-text bold v-if="ownerEmailList.length">
					{{ ownerEmailList.join(', ') }}
				</n8n-text>
			</n8n-text>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	padding: var(--spacing-s);
	padding-top: 0;
	margin-top: 0;
	display: flex;
	flex-direction: column;
}

.nodeIcon {
	--node-icon-size: 36px;
	margin-right: var(--spacing-s);
}

.description {
	margin: var(--spacing-m) 0;
}
.separator {
	height: var(--border-width-base);
	background: var(--color-foreground-base);
	margin-bottom: var(--spacing-m);
}
.info {
	display: flex;
	align-items: center;
	justify-content: left;
	gap: var(--spacing-m);
	margin-bottom: var(--spacing-m);
	flex-wrap: wrap;
}
.info div {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.tooltipIcon {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
}

.contactOwnerHint {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	padding: var(--spacing-xs);
	border: var(--border-width-base) solid var(--color-foreground-base);
	border-radius: 0.25em;
}
</style>
