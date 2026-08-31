<script setup lang="ts">
import { computed } from 'vue';
import {
	N8nButton,
	N8nFormInput,
	N8nInput,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nTooltip,
} from '@n8n/design-system';

/**
 * Presentation shared by the project and instance role editors:
 * back button, heading + action buttons (create / save+discard), and the
 * name/description form (editable + read-only variants). The permission/scope
 * body is provided by the default slot so each role type keeps its own editor.
 */

type ValidationRule = { name: string; config?: Record<string, unknown> };

export type RoleEditorLabels = {
	newRoleTitle: string;
	roleName: string;
	description: string;
	optional: string;
	systemRoleNotEditable: string;
	discardChanges: string;
	save: string;
	create: string;
};

const props = defineProps<{
	/** Creating a brand-new role (no slug yet). */
	isNew: boolean;
	isReadOnly: boolean;
	/** Show the Discard + Save buttons (existing, editable, loaded role). */
	showEditButtons: boolean;
	/** Show the Create button (new role). */
	showCreateButton: boolean;
	hasUnsavedChanges: boolean;
	backButtonText: string;
	labels: RoleEditorLabels;
	displayNameValidationRules?: ValidationRule[];
	showDisplayNameError?: boolean;
}>();

const displayName = defineModel<string>('displayName', { required: true });
const description = defineModel<string | null | undefined>('description');

const heading = computed(() =>
	props.isNew ? props.labels.newRoleTitle : `Role "${displayName.value}"`,
);

const emit = defineEmits<{
	back: [];
	save: [];
	discard: [];
	create: [];
}>();
</script>

<template>
	<N8nSettingsLayout show-back :back-label="backButtonText" @back="emit('back')">
		<N8nSettingsPageHeader :title="heading" :show-docs-link="false">
			<template v-if="showEditButtons" #actions>
				<N8nButton variant="subtle" :disabled="!hasUnsavedChanges" @click="emit('discard')">
					{{ labels.discardChanges }}
				</N8nButton>
				<N8nButton :disabled="!hasUnsavedChanges" @click="emit('save')">
					{{ labels.save }}
				</N8nButton>
			</template>
			<template v-else-if="showCreateButton" #actions>
				<N8nButton @click="emit('create')">{{ labels.create }}</N8nButton>
			</template>
		</N8nSettingsPageHeader>

		<div class="mb-l" :class="$style.formContainer">
			<!-- Read-only: wrap inputs with a tooltip explaining why they are disabled -->
			<template v-if="isReadOnly">
				<N8nFormInput
					v-model="displayName"
					:label="labels.roleName"
					class="mb-s"
					show-required-asterisk
					required
				>
					<N8nTooltip :content="labels.systemRoleNotEditable" placement="top">
						<N8nInput v-model="displayName" :maxlength="100" disabled />
					</N8nTooltip>
				</N8nFormInput>
				<N8nFormInput v-model="description" :label="labels.description">
					<N8nTooltip :content="labels.systemRoleNotEditable" placement="top">
						<N8nInput
							v-model="description"
							type="textarea"
							:placeholder="labels.optional"
							:maxlength="500"
							:autosize="{ minRows: 2, maxRows: 4 }"
							disabled
						/>
					</N8nTooltip>
				</N8nFormInput>
			</template>
			<!-- Editable: standard N8nFormInput with full validation -->
			<template v-else>
				<N8nFormInput
					v-model="displayName"
					:label="labels.roleName"
					validate-on-blur
					:validation-rules="displayNameValidationRules"
					:show-validation-warnings="showDisplayNameError"
					class="mb-s"
					show-required-asterisk
					required
					:maxlength="100"
				/>
				<N8nFormInput
					v-model="description"
					:label="labels.description"
					:placeholder="labels.optional"
					type="textarea"
					:maxlength="500"
					:autosize="{ minRows: 2, maxRows: 4 }"
				/>
			</template>
		</div>

		<slot />
	</N8nSettingsLayout>
</template>

<style lang="css" module>
.formContainer {
	max-width: 415px;
}
</style>
