<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useViewStacks } from '../composables/useViewStacks';
import { useUsersStore } from '@/stores/users.store';

const { activeViewStack } = useViewStacks();

const { communityNodeDetails } = activeViewStack;

interface DownloadData {
	downloads: Array<{ downloads: number }>;
}

const publisherName = ref<string | undefined>(undefined);
const downloads = ref<string | null>(null);

const isOwner = computed(() => useUsersStore().isInstanceOwner);

const ownersEmail = computed(() =>
	useUsersStore()
		.allUsers.filter((user) => user.role?.includes('owner'))
		.map((user) => user.email),
);

async function installPackage() {
	console.log('Install package');
}

const formatNumber = (number: number) => {
	if (!number) return null;
	return new Intl.NumberFormat('en-US').format(number);
};

async function fetchPackageInfo(packageName: string) {
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
	<div :class="$style.card">
		<div :class="$style.header">
			<div :class="$style.title">
				<n8n-node-icon
					v-if="communityNodeDetails?.nodeIcon"
					:class="$style.nodeIcon"
					:type="communityNodeDetails.nodeIcon.iconType || 'unknown'"
					:src="communityNodeDetails.nodeIcon.icon"
					:name="communityNodeDetails.nodeIcon.icon"
					:color="communityNodeDetails.nodeIcon.color"
					:circle="false"
					:show-tooltip="false"
				/>
				<span>{{ communityNodeDetails?.title }}</span>
			</div>
			<div>
				<div v-if="communityNodeDetails?.installed" :class="$style.installed">
					<n8n-icon :class="$style.installedIcon" icon="users" />
					<n8n-text color="text-light" size="small" bold> Installed </n8n-text>
				</div>
				<N8nButton
					v-else-if="isOwner"
					:loading="false"
					:disabled="false"
					label="Install Node"
					size="small"
					@click="installPackage"
				/>
			</div>
		</div>
		<n8n-text :class="$style.description" color="text-base" size="medium">
			{{ communityNodeDetails?.description }}
		</n8n-text>
		<div :class="$style.separator"></div>
		<div :class="$style.info">
			<n8n-tooltip placement="top" v-if="communityNodeDetails?.verified">
				<template #content>This community node has been reviewed and approved by n8n</template>
				<div>
					<FontAwesomeIcon :class="$style.tooltipIcon" icon="check-circle" />
					<n8n-text color="text-light" size="xsmall" bold> Verified </n8n-text>
				</div>
			</n8n-tooltip>

			<n8n-tooltip placement="top" v-else>
				<template #content
					>This community node was added via npm and has not been verified by n8n</template
				>
				<div>
					<FontAwesomeIcon :class="$style.tooltipIcon" icon="cube" />
					<n8n-text color="text-light" size="xsmall" bold> Via npm </n8n-text>
				</div>
			</n8n-tooltip>

			<div v-if="downloads">
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="download" />
				<n8n-text color="text-light" size="xsmall" bold> {{ downloads }} Downloads </n8n-text>
			</div>

			<div v-if="publisherName">
				<FontAwesomeIcon :class="$style.tooltipIcon" icon="user" />
				<n8n-text color="text-light" size="xsmall" bold>
					Published by {{ publisherName }}
				</n8n-text>
			</div>
		</div>
		<div v-if="!isOwner && !communityNodeDetails?.installed" :class="$style.contactOwnerHint">
			<n8n-icon color="text-light" icon="info-circle" size="large" />
			<n8n-text color="text-base" size="medium">
				<div style="padding-bottom: 8px">
					Please contact an administrator to install this community node:
				</div>
				<n8n-text bold v-if="ownersEmail.length">
					{{ ownersEmail.join(', ') }}
				</n8n-text>
			</n8n-text>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 100%;
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;
}
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.title {
	display: flex;
	align-items: center;
	color: var(--color-text);
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
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
	justify-content: space-between;
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

.installedIcon {
	margin-right: var(--spacing-3xs);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}

.installed {
	display: flex;
	align-items: center;
	margin-right: var(--spacing-xs);
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
