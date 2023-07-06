<template>
	<n8n-callout
		v-if="shouldDisplay"
		theme="warning"
		icon="info-circle"
		override-icon
		:class="$style['v1-banner']"
	>
		<span v-html="locale.baseText('banners.v1.message')"></span>
		{{ '' }}
		<a v-if="isInstanceOwner" @click="dismissBanner('v1', 'permanent')">
			<span v-html="locale.baseText('banners.v1.action')"></span>
		</a>
		<template #trailingContent>
			<n8n-icon
				size="small"
				icon="xmark"
				:title="locale.baseText('banners.v1.iconTitle')"
				:class="$style.xmark"
				@click="dismissBanner('v1', 'temporary')"
			/>
		</template>
	</n8n-callout>
</template>

<script setup lang="ts">
import { VIEWS } from '@/constants';
import { computed } from 'vue';
import { useUIStore, useUsersStore, useRootStore } from '@/stores';
import { useRoute } from 'vue-router/composables';
import { i18n as locale } from '@/plugins/i18n';

const { isInstanceOwner } = useUsersStore();
const { dismissBanner } = useUIStore();

const shouldDisplay = computed(() => {
	if (!useRootStore().versionCli.startsWith('1.')) return false;

	if (useUIStore().banners.v1.dismissed) return false;

	const VIEWABLE_AT: string[] = [
		VIEWS.HOMEPAGE,
		VIEWS.COLLECTION,
		VIEWS.TEMPLATE,
		VIEWS.TEMPLATES,
		VIEWS.CREDENTIALS,
		VIEWS.VARIABLES,
		VIEWS.WORKFLOWS,
		VIEWS.EXECUTIONS,
	];

	const { name } = useRoute();

	if (name && VIEWABLE_AT.includes(name)) return true;

	return false;
});
</script>

<style module lang="scss">
.v1-banner {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	z-index: 999;

	a {
		text-decoration: underline;
	}

	.xmark {
		cursor: pointer;
	}
}
</style>
