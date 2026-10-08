<script lang="ts" setup>
import { computed } from 'vue';
import {
	N8nDialog,
	N8nDialogBody,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nLink,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';

const props = withDefaults(
	defineProps<{
		customRolesExist?: boolean;
	}>(),
	{
		customRolesExist: false,
	},
);

const visible = defineModel<boolean>();
const i18n = useI18n();

const titleKey = computed(() =>
	props.customRolesExist
		? 'projects.settings.role.contactAdmin.titleWithRoles'
		: 'projects.settings.role.contactAdmin.title',
);

const bodyKey = computed(() =>
	props.customRolesExist
		? 'projects.settings.role.contactAdmin.bodyWithRoles'
		: 'projects.settings.role.contactAdmin.body',
);
</script>

<template>
	<N8nDialog v-model:open="visible" size="medium">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText(titleKey) }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<N8nText tag="p" size="medium">
				<I18nT :keypath="bodyKey" tag="span">
					<template #documentation>
						<N8nLink :href="CUSTOM_ROLES_DOCS_URL" :new-window="true">{{
							i18n.baseText('generic.documentation')
						}}</N8nLink>
					</template>
				</I18nT>
			</N8nText>
		</N8nDialogBody>
	</N8nDialog>
</template>
