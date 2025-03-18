<script setup lang="ts">
import { VIEWS } from '@/constants';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

export interface Props {
	packageName: string;
}
const props = defineProps<Props>();

const router = useRouter();

const bugsUrl = ref<string | undefined>(undefined);

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

		bugsUrl.value = data.bugs?.url;
	} catch (error) {
		console.error(error);
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
		<n8n-link theme="text" @click="openSettingsPage">
			<n8n-text size="small" color="primary" bold> Manage </n8n-text>
		</n8n-link>
		<n8n-text size="small" color="primary" bold>|</n8n-text>
		<n8n-link theme="text" @click="openIssuesPage">
			<n8n-text size="small" color="primary" bold> Report issue </n8n-text>
		</n8n-link>
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
