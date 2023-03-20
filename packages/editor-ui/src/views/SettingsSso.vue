<script lang="ts" setup>
import { useSSOStore } from '@/stores/sso';
import { i18n as locale } from '@/plugins/i18n';

const ssoStore = useSSOStore();
</script>

<template>
	<div>
		<n8n-heading size="2xlarge">{{ locale.baseText('settings.sso.title') }}</n8n-heading>
		<div>
			<n8n-heading :class="$style.subtitle" size="medium">{{
				locale.baseText('settings.sso.subtitle')
			}}</n8n-heading>
		</div>
		<n8n-info-tip>
			<i18n :class="$style.count" path="settings.sso.info">
				<template #link>
					<a href="https://docs.n8n.io/user-management/sso/" target="_blank">
						{{ locale.baseText('settings.sso.info.link') }}
					</a>
				</template>
			</i18n>
		</n8n-info-tip>
	</div>
</template>

<style lang="scss" module>
.subtitle {
	display: block;
	padding: var(--spacing-2xl) 0 var(--spacing-m);
}
</style>
