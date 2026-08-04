<script lang="ts" setup>
import { N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRolesStore } from '@n8n/stores/roles.store';
import { computed, ref, watch } from 'vue';

import Modal from '@/app/components/Modal.vue';
import RoleSelectDropdown from '@/features/roles/components/RoleSelectDropdown.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { VIEWS } from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import {
	TOTAL_INSTANCE_PERMISSIONS,
	countGrantedInstancePermissions,
} from '@/features/roles/instance/instanceRoleScopes';
import type { Role } from '@n8n/permissions';

import {
	CREATE_SERVICE_ACCOUNT_MODAL_KEY,
	DEFAULT_SERVICE_ACCOUNT_ROLE,
	SERVICE_ACCOUNT_NAME_MAX_LENGTH,
} from '../serviceAccounts.constants';

const props = defineProps<{ modalName: string; loading?: boolean }>();

const emit = defineEmits<{
	submit: [payload: { name: string; role: string }];
}>();

const i18n = useI18n();
const rolesStore = useRolesStore();
const settingsStore = useSettingsStore();

const name = ref('');
const role = ref<string>(DEFAULT_SERVICE_ACCOUNT_ROLE);

const isValid = computed(() => name.value.trim().length > 0);

// Owner and chatUser are rejected by the backend: owner-only branches assume a
// human, and chatUser gets no personal-owner project and no API-key scopes.
const assignableRoles = computed(() =>
	rolesStore.processedInstanceRoles.filter(
		(r) => r.slug !== 'global:owner' && r.slug !== 'global:chatUser',
	),
);
const systemRoles = computed(() => assignableRoles.value.filter((r) => r.systemRole));
const customRoles = computed(() => rolesStore.customInstanceRoles);

const permissionCountFor = (r: Role) => countGrantedInstancePermissions(r.scopes ?? []);

watch(
	() => props.modalName,
	() => {
		name.value = '';
		role.value = DEFAULT_SERVICE_ACCOUNT_ROLE;
	},
);

const onSubmit = () => {
	if (!isValid.value) return;
	emit('submit', { name: name.value.trim(), role: role.value });
};
</script>

<template>
	<Modal
		:name="props.modalName ?? CREATE_SERVICE_ACCOUNT_MODAL_KEY"
		:title="i18n.baseText('settings.serviceAccounts.createModal.title')"
		:center="true"
		width="480px"
		data-test-id="create-service-account-modal"
		@enter="onSubmit"
	>
		<template #content>
			<div :class="$style.content">
				<div>
					<N8nInputLabel
						:label="i18n.baseText('settings.serviceAccounts.createModal.name.label')"
						:required="true"
					>
						<N8nInput
							v-model="name"
							:placeholder="i18n.baseText('settings.serviceAccounts.createModal.name.placeholder')"
							:maxlength="SERVICE_ACCOUNT_NAME_MAX_LENGTH"
							data-test-id="service-account-name-input"
						/>
					</N8nInputLabel>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.serviceAccounts.createModal.name.hint') }}
					</N8nText>
				</div>
				<N8nInputLabel :label="i18n.baseText('settings.serviceAccounts.createModal.role.label')">
					<RoleSelectDropdown
						:system-roles="systemRoles"
						:custom-roles="customRoles"
						:current-role="role"
						:has-custom-roles-license="settingsStore.isCustomRolesFeatureEnabled"
						:can-manage-roles="hasPermission(['rbac'], { rbac: { scope: 'role:manage' } })"
						:add-custom-role-route-name="VIEWS.INSTANCE_NEW_ROLE"
						:permission-count-fn="permissionCountFor"
						:total-permissions="TOTAL_INSTANCE_PERMISSIONS"
						:edit-route-name="VIEWS.INSTANCE_ROLE_SETTINGS"
						:view-route-name="VIEWS.INSTANCE_ROLE_VIEW"
						:from-view="VIEWS.SERVICE_ACCOUNTS_SETTINGS"
						test-id="service-account-role-dropdown"
						@update:role="role = $event"
					/>
				</N8nInputLabel>
			</div>
		</template>
		<template #footer>
			<N8nButton
				:label="i18n.baseText('settings.serviceAccounts.createModal.submit')"
				:disabled="!isValid"
				:loading="props.loading"
				float="right"
				data-test-id="create-service-account-submit"
				@click="onSubmit"
			/>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--m);
}
</style>
