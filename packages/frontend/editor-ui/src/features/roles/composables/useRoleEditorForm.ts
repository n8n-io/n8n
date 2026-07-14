import { useToast } from '@/app/composables/useToast';
import { useRolesStore } from '@/app/stores/roles.store';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useAsyncState } from '@vueuse/core';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const DISPLAY_NAME_MIN_LENGTH = 2;

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
	/**
	 * Filter applied to every scope set entering the form (default seed, fetched role,
	 * reset). Keeps the editor — and anything it saves — limited to scopes it exposes,
	 * so a role loaded with non-assignable scopes is sanitized rather than forwarded.
	 */
	filterScopes?: (scopes: string[]) => string[];
	/** Error message shown when the initial role fetch fails. */
	fetchError: string;
}

export function useRoleEditorForm({
	roleSlug,
	viewRoute,
	defaultScopes,
	filterScopes,
	fetchError,
}: UseRoleEditorFormOptions) {
	const rolesStore = useRolesStore();
	const route = useRoute();
	const router = useRouter();
	const { showError, showMessage } = useToast();
	const i18n = useI18n();

	const activeTab = ref<string>((route.query?.tab as string) ?? 'permissions');

	watch(activeTab, (newTab) => {
		void router.replace({ query: { ...route.query, tab: newTab } });
	});

	const tabOptions = computed(() => [
		{ label: i18n.baseText('projectRoles.tab.permissions'), value: 'permissions' },
		{ label: i18n.baseText('projectRoles.tab.assignments'), value: 'assignments' },
	]);

	const sanitizeScopes = (scopes: string[]): string[] =>
		filterScopes ? filterScopes(scopes) : scopes;

	const defaultForm = (): RoleEditorForm => ({
		displayName: '',
		description: '',
		scopes: sanitizeScopes(defaultScopes?.() ?? []),
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
				const scopes = sanitizeScopes(role.scopes);
				// Sanitize initialState too so the form isn't falsely dirty on load.
				initialState.value = structuredClone({ ...role, scopes });
				return {
					displayName: role.displayName,
					description: role.description,
					scopes,
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
		{ name: 'MIN_LENGTH', config: { minimum: DISPLAY_NAME_MIN_LENGTH } },
	];

	const submitted = ref(false);

	const isDisplayNameValid = computed(
		() => form.value.displayName.trim().length >= DISPLAY_NAME_MIN_LENGTH,
	);

	function validateOnSubmit(errorTitle: BaseTextKey): boolean {
		submitted.value = true;

		if (!isDisplayNameValid.value) {
			showMessage({
				type: 'error',
				title: i18n.baseText(errorTitle),
				message: i18n.baseText('roles.create.validation.nameMinLength', {
					interpolate: { min: DISPLAY_NAME_MIN_LENGTH },
				}),
			});
			return false;
		}

		return true;
	}

	function resetForm(payload: Role | undefined): void {
		submitted.value = false;
		form.value = payload
			? {
					displayName: payload.displayName,
					description: payload.description,
					scopes: sanitizeScopes(payload.scopes),
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
		submitted,
		isDisplayNameValid,
		validateOnSubmit,
		resetForm,
	};
}
