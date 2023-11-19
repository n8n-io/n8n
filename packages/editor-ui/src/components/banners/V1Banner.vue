<script lang="ts" setup>
import BaseBanner from '@/components/banners/BaseBanner.vue';
import { i18n as locale } from '@/plugins/i18n';
import { useUsersStore } from '@/stores/users.store';
import { useUIStore } from '@/stores/ui.store';

const uiStore = useUIStore();
const usersStore = useUsersStore();

async function dismissPermanently() {
	await uiStore.dismissBanner('V1', 'permanent');
}
</script>

<template>
	<base-banner customIcon="info-circle" theme="warning" name="V1" :class="$style.v1container">
		<template #mainContent>
			<span v-html="locale.baseText('banners.v1.message')"></span>
			<a
				v-if="usersStore.isInstanceOwner"
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
.v1container {
	a,
	.link {
		font-weight: var(--font-weight-bold);
		text-decoration: underline;
	}
}
</style>
