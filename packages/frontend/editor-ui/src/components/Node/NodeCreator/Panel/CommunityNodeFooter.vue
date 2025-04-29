<script setup lang="ts">
import { VIEWS } from '@/constants';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { captureException } from '@sentry/vue';

import { N8nText, N8nLink } from '@n8n/design-system';

export interface Props {
	packageName: string;
}
const props = defineProps<Props>();

const router = useRouter();

const bugsUrl = ref<string>(`https://registry.npmjs.org/${props.packageName}`);

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
	<div :class="$style.container">
		<N8nLink theme="text" @click="openSettingsPage">
			<N8nText size="small" color="primary" bold> Manage </N8nText>
		</N8nLink>
		<N8nText size="small" color="primary" bold>|</N8nText>
		<N8nLink theme="text" @click="openIssuesPage">
			<N8nText size="small" color="primary" bold> Report issue </N8nText>
		</N8nLink>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: var(--spacing-s);
	padding-bottom: var(--spacing-s);
}
</style>
