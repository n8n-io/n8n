<script lang="ts" setup>
import { computed } from 'vue';
import { ElDialog } from 'element-plus';
import { N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
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
	<ElDialog v-model="visible" width="400" :show-close="true">
		<template #header>
			<N8nText tag="span" size="large" :bold="true">
				{{ i18n.baseText(titleKey) }}
			</N8nText>
		</template>

		<div :class="$style.content">
			<N8nText tag="p" size="medium">
				{{ i18n.baseText(bodyKey).replace('{documentation}', '') }}
				<N8nLink :href="CUSTOM_ROLES_DOCS_URL" :new-window="true">
					{{ i18n.baseText('generic.documentation') }}
				</N8nLink>
			</N8nText>
		</div>
	</ElDialog>
</template>

<style lang="scss" module>
.content {
	padding: var(--spacing--xs) 0;
}
</style>
