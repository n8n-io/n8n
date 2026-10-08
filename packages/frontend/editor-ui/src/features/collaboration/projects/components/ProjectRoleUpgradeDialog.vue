<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { I18nT } from 'vue-i18n';

import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter } from '@n8n/design-system';
type Props = {
	limit: number;
	planName?: string;
};

const props = defineProps<Props>();
const visible = defineModel<boolean>();
const pageRedirectionHelper = usePageRedirectionHelper();
const locale = useI18n();

const goToUpgrade = async () => {
	await pageRedirectionHelper.goToUpgrade('rbac', 'upgrade-rbac');
	visible.value = false;
};
</script>
<template>
	<N8nDialog
		v-model:open="visible"
		size="medium"
		:header="locale.baseText('projects.settings.role.upgrade.title')"
	>
		<N8nDialogBody>
			<I18nT keypath="projects.settings.role.upgrade.message" scope="global">
				<template #planName>{{ props.planName }}</template>
				<template #limit>
					{{
						locale.baseText('projects.create.limit', {
							adjustToNumber: props.limit,
							interpolate: { count: String(props.limit) },
						})
					}}
				</template>
			</I18nT>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="subtle" native-type="button" @click="visible = false">{{
				locale.baseText('generic.cancel')
			}}</N8nButton>
			<N8nButton variant="solid" native-type="button" @click="goToUpgrade">{{
				locale.baseText('projects.create.limitReached.link')
			}}</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>
