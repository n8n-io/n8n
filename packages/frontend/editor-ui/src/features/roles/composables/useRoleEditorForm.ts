import { useToast } from '@/app/composables/useToast';
import { useRolesStore } from '@/app/stores/roles.store';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useAsyncState } from '@vueuse/core';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export type RoleEditorForm = {
	displayName: string;
	description: string | null | undefined;
	scopes: string[];
};

export interface UseRoleEditorFormOptions {
	/** Getter for the role slug (e.g. `() => props.roleSlug`). */
	roleSlug: () => string | undefined;
	/** Route name that renders the editor in read-only mode (the "view" route). */
	viewRoute: string;
	/** Returns the default scopes for a brand-new (not-yet-saved) role. */
	defaultScopes?: () => string[];
	/** Error message shown when the initial role fetch fails. */
	fetchError: string;
}

export function useRoleEditorForm({
	roleSlug,
	viewRoute,
	defaultScopes,
	fetchError,
}: UseRoleEditorFormOptions) {
	const rolesStore = useRolesStore();
	const route = useRoute();
	const router = useRouter();
	const { showError } = useToast();
	const i18n = useI18n();

	const activeTab = ref<string>((route.query?.tab as string) ?? 'permissions');

	watch(activeTab, (newTab) => {
		void router.replace({ query: { ...route.query, tab: newTab } });
	});

	const tabOptions = computed(() => [
		{ label: i18n.baseText('projectRoles.tab.permissions'), value: 'permissions' },
		{ label: i18n.baseText('projectRoles.tab.assignments'), value: 'assignments' },
	]);

	const defaultForm = (): RoleEditorForm => ({
		displayName: '',
		description: '',
		scopes: defaultScopes?.() ?? [],
	});

	const initialState = ref<Role | undefined>();

	const { state: form, isLoading } = useAsyncState(
		async () => {
			const slug = roleSlug();
			if (!slug) {
				return defaultForm();
			}

			try {
				const role = await rolesStore.fetchRoleBySlug({ slug });
				initialState.value = structuredClone(role);
				return {
					displayName: role.displayName,
					description: role.description,
					scopes: role.scopes,
				};
			} catch (error) {
				showError(error, fetchError);
				return defaultForm();
			}
		},
		defaultForm(),
		{ shallow: false },
	);

	const isReadOnly = computed(
		() => initialState.value?.systemRole === true || route.name === viewRoute,
	);
	const isNew = computed(() => !roleSlug());
	const showEditButtons = computed(
		() => Boolean(initialState.value) && !isReadOnly.value && !isLoading.value,
	);
	const showCreateButton = computed(() => isNew.value);

	const hasUnsavedChanges = computed(() => {
		if (!initialState.value) return false;

		if (!isEqual(initialState.value.displayName, form.value.displayName)) return true;
		// Treat empty string and null as equivalent for the optional description field.
		if (!isEqual(initialState.value.description ?? null, form.value.description || null))
			return true;
		if (!isEqual(sortBy(initialState.value.scopes), sortBy(form.value.scopes))) return true;

		return false;
	});

	const displayNameValidationRules = [
		{ name: 'REQUIRED' },
		{ name: 'MIN_LENGTH', config: { minimum: 2 } },
	];

	function resetForm(payload: Role | undefined): void {
		form.value = payload
			? {
					displayName: payload.displayName,
					description: payload.description,
					scopes: payload.scopes,
				}
			: defaultForm();
	}

	return {
		activeTab,
		tabOptions,
		form,
		isLoading,
		initialState,
		isReadOnly,
		isNew,
		showEditButtons,
		showCreateButton,
		hasUnsavedChanges,
		displayNameValidationRules,
		resetForm,
	};
}
