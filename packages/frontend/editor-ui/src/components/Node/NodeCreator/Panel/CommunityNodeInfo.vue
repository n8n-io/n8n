<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useViewStacks } from '../composables/useViewStacks';
import { useUsersStore } from '@/stores/users.store';
import { i18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { captureException } from '@sentry/vue';
import ShieldIcon from 'virtual:icons/fa-solid/shield-alt';
import { useInstalledCommunityPackage } from '@/composables/useInstalledCommunityPackage';

import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import CommunityNodeUpdateInfo from '@/components/Node/NodeCreator/Panel/CommunityNodeUpdateInfo.vue';

const { activeViewStack } = useViewStacks();

const { communityNodeDetails } = activeViewStack;

interface DownloadData {
	downloads: Array<{ downloads: number }>;
}

const publisherName = ref<string | undefined>(undefined);
const downloads = ref<string | null>(null);
const verified = ref(false);
const official = ref(false);
const packageName = computed(() => communityNodeDetails?.packageName);
const { installedPackage, initInstalledPackage, isUpdateCheckAvailable } =
	useInstalledCommunityPackage(packageName);

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
	let packageInfo = installedPackage.value;
	if (communityNodeDetails?.installed && !packageInfo) {
		packageInfo = await initInstalledPackage();
	}

	if (communityNodeAttributes) {
		publisherName.value = communityNodeAttributes.companyName ?? communityNodeAttributes.authorName;
		downloads.value = formatNumber(communityNodeAttributes.numberOfDownloads);
		official.value = communityNodeAttributes.isOfficialNode;

		if (!packageInfo) {
			verified.value = true;
		} else {
			const verifiedVersions = communityNodeAttributes.nodeVersions?.map((v) => v.npmVersion) ?? [];
			verified.value = verifiedVersions.includes(packageInfo.installedVersion);
		}

		return;
	}

	const url = `https://registry.npmjs.org/${packageName}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			captureException(new Error('Could not get metadata for package'), { extra: { packageName } });
			return;
		}

		const data = await response.json();
		const publisher = data.maintainers?.[0]?.name as string | undefined;
		publisherName.value = publisher;

		const today = new Date().toISOString().split('T')[0];
		const downloadsUrl = `https://api.npmjs.org/downloads/range/2022-01-01:${today}/${packageName}`;

		const downloadsResponse = await fetch(downloadsUrl);

		if (!downloadsResponse.ok) {
			captureException(new Error('Could not get downloads for package'), {
				extra: { packageName },
			});
			return;
		}

		const downloadsData: DownloadData = await downloadsResponse.json();
		if (!downloadsData.downloads?.length) return;

		const total = downloadsData.downloads.reduce((sum, day) => sum + day.downloads, 0);

		downloads.value = formatNumber(total);
	} catch (error) {
		captureException(error, { extra: { packageName } });
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
		<N8nText :class="$style.description" color="text-base" size="medium">
			{{ communityNodeDetails?.description }}
		</N8nText>
		<CommunityNodeUpdateInfo
			v-if="isUpdateCheckAvailable && installedPackage?.updateAvailable"
			data-test-id="update-available"
			:package-name="communityNodeDetails?.packageName"
			source="node creator panel"
		/>
		<div v-else :class="$style.separator"></div>
		<div :class="$style.info">
			<N8nTooltip v-if="verified" placement="top">
				<template #content>{{
					official
						? i18n.baseText('communityNodeInfo.officialApproved')
						: i18n.baseText('communityNodeInfo.approved')
				}}</template>
				<div>
					<ShieldIcon :class="$style.tooltipIcon" />
					<N8nText color="text-light" size="xsmall" bold data-test-id="verified-tag">
						{{ i18n.baseText('communityNodeInfo.approved.label') }}
					</N8nText>
				</div>
			</N8nTooltip>

			<N8nTooltip v-else placement="top">
				<template #content>{{ i18n.baseText('communityNodeInfo.unverified') }}</template>
				<div>
					<N8nIcon :class="$style.tooltipIcon" icon="box" />
					<N8nText color="text-light" size="xsmall" bold>
						{{ i18n.baseText('communityNodeInfo.unverified.label') }}
					</N8nText>
				</div>
			</N8nTooltip>

			<div v-if="downloads">
				<N8nIcon :class="$style.tooltipIcon" icon="hard-drive-download" />
				<N8nText color="text-light" size="xsmall" bold data-test-id="number-of-downloads">
					{{ i18n.baseText('communityNodeInfo.downloads', { interpolate: { downloads } }) }}
				</N8nText>
			</div>

			<div v-if="publisherName">
				<N8nIcon :class="$style.tooltipIcon" icon="user" />
				<N8nText color="text-light" size="xsmall" bold data-test-id="publisher-name">
					{{ i18n.baseText('communityNodeInfo.publishedBy', { interpolate: { publisherName } }) }}
				</N8nText>
			</div>
		</div>
		<div v-if="!isOwner && !communityNodeDetails?.installed" :class="$style.contactOwnerHint">
			<N8nIcon color="text-light" icon="info" size="large" />
			<N8nText color="text-base" size="medium">
				<div style="padding-bottom: 8px">
					{{ i18n.baseText('communityNodeInfo.contact.admin') }}
				</div>
				<N8nText v-if="ownerEmailList.length" bold>
					{{ ownerEmailList.join(', ') }}
				</N8nText>
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	padding: var(--spacing--sm);
	padding-top: 0;
	margin-top: 0;
	display: flex;
	flex-direction: column;
}

.nodeIcon {
	--node-icon-size: 36px;
	margin-right: var(--spacing--sm);
}

.description {
	margin: var(--spacing--md) 0;
}
.separator {
	height: var(--border-width);
	background: var(--color--foreground);
	margin-bottom: var(--spacing--md);
}
.info {
	display: flex;
	align-items: center;
	justify-content: left;
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--md);
	flex-wrap: wrap;
}
.info div {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.tooltipIcon {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	width: 12px;
}

.contactOwnerHint {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--color--foreground);
	border-radius: 0.25em;
}
</style>
