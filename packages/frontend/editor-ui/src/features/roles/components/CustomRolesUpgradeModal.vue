<script lang="ts" setup>
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';

const visible = defineModel<boolean>();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();

const onViewPlans = async () => {
	await goToUpgrade('custom-roles-selector', 'upgrade-custom-roles');
	visible.value = false;
};
</script>

<template>
	<N8nDialog
		v-model:open="visible"
		size="medium"
		:header="i18n.baseText('projects.settings.role.upgrade.title')"
	>
		<N8nDialogBody>
			<N8nText tag="p" size="medium">
				<I18nT keypath="projects.settings.role.upgrade.custom.body" tag="span">
					<template #documentation>
						<N8nLink :href="CUSTOM_ROLES_DOCS_URL" :new-window="true">{{
							i18n.baseText('generic.documentation')
						}}</N8nLink>
					</template>
				</I18nT>
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="subtle" @click="visible = false">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton variant="solid" @click="onViewPlans">
				{{ i18n.baseText('projects.settings.role.upgrade.custom.viewPlans') }}
				<template #append>
					<span :class="$style.externalIcon">↗</span>
				</template>
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.externalIcon {
	margin-left: var(--spacing--4xs);
}
</style>
