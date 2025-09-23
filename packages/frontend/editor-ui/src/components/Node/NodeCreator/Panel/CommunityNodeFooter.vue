<script setup lang="ts">
import { VIEWS } from '@/constants';
import { captureException } from '@sentry/vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { N8nLink, N8nText } from '@n8n/design-system';
import { fetchInstalledPackageInfo, type ExtendedPublicInstalledPackage } from './utils';

export interface Props {
	packageName: string;
	showManage: boolean;
}
const props = defineProps<Props>();

const router = useRouter();

const bugsUrl = ref<string>(`https://registry.npmjs.org/${props.packageName}`);
const installedPackage = ref<ExtendedPublicInstalledPackage | undefined>(undefined);

async function openSettingsPage() {
	await router.push({ name: VIEWS.COMMUNITY_NODES });
}

async function openIssuesPage() {
	if (bugsUrl.value) {
		window.open(bugsUrl.value, '_blank');
	}
}

async function getBugsUrl(packageName: string) {
	const url = `https://registry.npmjs.org/${packageName}`;

	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error('Could not get metadata for package');
		}

		const data = await response.json();

		if (data.bugs?.url) {
			bugsUrl.value = data.bugs.url;
		}
	} catch (error) {
		captureException(error);
	}
}

onMounted(async () => {
	if (props.packageName) {
		await getBugsUrl(props.packageName);
		installedPackage.value = await fetchInstalledPackageInfo(props.packageName);
	}
});
</script>

<template>
	<div>
		<div :class="$style.separator"></div>
		<div :class="$style.container">
			<N8nText v-if="installedPackage" size="small" color="text-light" style="margin-right: auto">
				Package version {{ installedPackage.installedVersion }} ({{
					installedPackage.updateAvailable && !installedPackage.unverifiedUpdate
						? 'Legacy'
						: 'Latest'
				}})
			</N8nText>
			<template v-if="props.showManage">
				<N8nLink theme="text" @click="openSettingsPage">
					<N8nText size="small" color="primary" bold> Manage </N8nText>
				</N8nLink>
				<N8nText size="small" style="color: var(--color-foreground-base)" bold>|</N8nText>
			</template>
			<N8nLink theme="text" @click="openIssuesPage">
				<N8nText size="small" color="primary" bold> Report issue </N8nText>
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	justify-content: right;
	align-items: center;
	gap: var(--spacing-2xs);
	padding: var(--spacing-s);
}
.separator {
	height: var(--border-width-base);
	background: var(--color-foreground-base);
	margin-right: var(--spacing-s);
	margin-left: var(--spacing-s);
}
</style>
