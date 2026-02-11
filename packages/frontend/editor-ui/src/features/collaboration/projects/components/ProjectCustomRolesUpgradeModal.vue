<script lang="ts" setup>
import { ElDialog } from 'element-plus';
import { N8nButton, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { CUSTOM_ROLES_DOCS_URL } from '@/app/constants';

const visible = defineModel<boolean>();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();

const onViewPlans = async () => {
	await goToUpgrade('custom-roles', 'upgrade-custom-roles');
	visible.value = false;
};
</script>

<template>
	<ElDialog
		v-model="visible"
		:title="i18n.baseText('projects.settings.role.upgrade.title')"
		width="400"
	>
		<div :class="$style.content">
			<N8nText tag="p" size="medium">
				{{
					i18n.baseText('projects.settings.role.upgrade.custom.body').replace('{documentation}', '')
				}}
				<N8nLink :href="CUSTOM_ROLES_DOCS_URL" :new-window="true">
					{{ i18n.baseText('generic.documentation') }}
				</N8nLink>
			</N8nText>
		</div>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" @click="visible = false">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="primary" @click="onViewPlans">
					{{ i18n.baseText('projects.settings.role.upgrade.custom.viewPlans') }}
					<template #append>
						<span :class="$style.externalIcon">↗</span>
					</template>
				</N8nButton>
			</div>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.content {
	padding: var(--spacing--xs) 0;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.externalIcon {
	margin-left: var(--spacing--4xs);
}
</style>
