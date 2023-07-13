<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { useUsersStore } from '@/stores';
import { useUIStore } from '@/stores/ui.store';
import { BANNERS } from '@/constants';

const uiStore = useUIStore();

const { isInstanceOwner } = useUsersStore();

async function dismissPermanently() {
	await uiStore.dismissBanner(BANNERS.V1, 'permanent');
}
</script>

<template>
	<base-banner customIcon="info-circle" theme="warning" :name="BANNERS.V1">
		<template #mainContent>
			<span v-html="locale.baseText('banners.v1.message')"></span>
			<a
				v-if="isInstanceOwner"
				:class="$style.link"
				@click="dismissPermanently"
				data-test-id="banner-confirm-v1"
			>
				<span v-html="locale.baseText('generic.dontShowAgain')"></span>
			</a>
		</template>
	</base-banner>
</template>

<style lang="scss" module>
a,
.link {
	font-weight: var(--font-weight-bold);
	text-decoration: underline;
}
</style>
