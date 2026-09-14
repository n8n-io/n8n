<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nHeading, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { APP_MODALS_ELEMENT_ID } from '@/app/constants';

const props = defineProps<{
	/** The role being deleted. */
	role: Role | null;
	/** Number of users currently assigned to the role. */
	userCount: number;
	/** Roles the assigned users can be reassigned to (excludes the role being deleted). */
	availableRoles: Role[];
}>();

const emit = defineEmits<{
	confirm: [reassignRoleSlug: string];
}>();

const visible = defineModel<boolean>();
const i18n = useI18n();

// Intentionally starts empty so the admin has to make an active choice.
const selectedRoleSlug = ref<string | undefined>(undefined);

// Reset the selection every time the modal is (re)opened.
watch(visible, (isOpen) => {
	if (isOpen) selectedRoleSlug.value = undefined;
});

const selectedRole = computed(() =>
	props.availableRoles.find((r) => r.slug === selectedRoleSlug.value),
);

const userCountText = computed(() =>
	i18n.baseText('roles.instance.action.delete.reassign.userCount', {
		adjustToNumber: props.userCount,
		interpolate: { count: props.userCount },
	}),
);

const confirmLabel = computed(() =>
	selectedRole.value
		? i18n.baseText('roles.instance.action.delete.reassign.confirmWithRole', {
				interpolate: { roleName: selectedRole.value.displayName },
			})
		: i18n.baseText('roles.instance.action.delete.reassign.confirm'),
);

function onCancel() {
	visible.value = false;
}

function onConfirm() {
	if (!selectedRoleSlug.value) return;
	emit('confirm', selectedRoleSlug.value);
}
</script>

<template>
	<ElDialog
		v-model="visible"
		width="540"
		:show-close="true"
		:append-to="`#${APP_MODALS_ELEMENT_ID}`"
		data-test-id="delete-instance-role-modal"
	>
		<template #header>
			<N8nHeading tag="h2" size="xlarge" :bold="true">
				{{
					i18n.baseText('roles.instance.action.delete.reassign.title', {
						interpolate: { roleName: role?.displayName ?? '' },
					})
				}}
			</N8nHeading>
		</template>

		<div :class="$style.content">
			<N8nText tag="p" size="medium" color="text-base">
				<strong>{{ userCountText }}</strong>
				{{ i18n.baseText('roles.instance.action.delete.reassign.description') }}
			</N8nText>

			<div :class="$style.field">
				<N8nText tag="label" size="medium" color="text-dark">
					{{ i18n.baseText('roles.instance.action.delete.reassign.label') }}
				</N8nText>
				<N8nSelect
					v-model="selectedRoleSlug"
					:placeholder="i18n.baseText('roles.instance.action.delete.reassign.placeholder')"
					size="large"
					data-test-id="reassign-role-select"
				>
					<N8nOption
						v-for="option in availableRoles"
						:key="option.slug"
						:label="option.displayName"
						:value="option.slug"
					/>
				</N8nSelect>
			</div>
		</div>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="outline" data-test-id="cancel-delete-role" @click="onCancel">
					{{ i18n.baseText('roles.action.cancel') }}
				</N8nButton>
				<N8nButton
					variant="destructive"
					:disabled="!selectedRoleSlug"
					data-test-id="confirm-delete-reassign-role"
					@click="onConfirm"
				>
					{{ confirmLabel }}
				</N8nButton>
			</div>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
