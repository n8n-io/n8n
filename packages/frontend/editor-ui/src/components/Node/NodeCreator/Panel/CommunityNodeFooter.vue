<script setup lang="ts">
import { VIEWS } from '@/constants';
import { captureException } from '@sentry/vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useInstalledCommunityPackage } from '@/composables/useInstalledCommunityPackage';
import { i18n } from '@n8n/i18n';

import { N8nLink, N8nText } from '@n8n/design-system';
export interface Props {
	packageName: string;
	showManage: boolean;
}
const props = defineProps<Props>();

const router = useRouter();

const bugsUrl = ref<string>(`https://registry.npmjs.org/${props.packageName}`);
const { installedPackage } = useInstalledCommunityPackage(props.packageName);

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
						? i18n.baseText('communityNodeFooter.legacy')
						: i18n.baseText('nodeSettings.latest')
				}})
			</N8nText>
			<template v-if="props.showManage">
				<N8nLink theme="text" @click="openSettingsPage">
					<N8nText size="small" color="primary" bold>
						{{ i18n.baseText('communityNodeFooter.manage') }}
					</N8nText>
				</N8nLink>
				<N8nText size="small" style="color: var(--color--foreground)" bold>|</N8nText>
			</template>
			<N8nLink theme="text" @click="openIssuesPage">
				<N8nText size="small" color="primary" bold>
					{{ i18n.baseText('communityNodeFooter.reportIssue') }}
				</N8nText>
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	justify-content: right;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
}
.separator {
	height: var(--border-width);
	background: var(--color--foreground);
	margin-right: var(--spacing--sm);
	margin-left: var(--spacing--sm);
}
</style>
