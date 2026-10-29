<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
	N8nTableBase,
	N8nTooltip,
	N8nUserSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import type { PrototypeMissingProject } from '../prototypeMissingProjects';

type SelectUser = {
	id: string;
	email?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	fullName?: string;
};

const props = defineProps<{
	open: boolean;
	environmentName: string;
	projects: PrototypeMissingProject[];
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const usersStore = useUsersStore();

const selectedIds = ref(new Set<string>());
const admins = ref<Record<string, string>>({});
const searchResults = ref<SelectUser[]>([]);
const keptUsers = ref<SelectUser[]>([]);
const isLoadingUsers = ref(false);

const bodyText = computed(() =>
	i18n.baseText('settings.promotions.apply.newProjects.dialog.body', {
		interpolate: { name: props.environmentName },
	}),
);

const selectedCount = computed(() => selectedIds.value.size);
const allSelected = computed(
	() => props.projects.length > 0 && selectedCount.value === props.projects.length,
);
const someSelected = computed(() => selectedCount.value > 0 && !allSelected.value);
const canConfirm = computed(
	() =>
		selectedCount.value > 0 &&
		props.projects.every(
			(project) => !selectedIds.value.has(project.id) || Boolean(admins.value[project.id]?.trim()),
		),
);
const confirmDisabledReason = computed(() =>
	i18n.baseText(
		selectedCount.value === 0
			? 'settings.promotions.apply.newProjects.dialog.confirmDisabled'
			: 'settings.promotions.apply.newProjects.dialog.confirmNeedsAdmin',
	),
);

const usersForSelect = computed(() => {
	const byId = new Map<string, SelectUser>();
	for (const user of [...keptUsers.value, ...searchResults.value]) {
		if (user.email) byId.set(user.id, user);
	}
	return [...byId.values()];
});

const confirmLabel = computed(() => {
	if (selectedCount.value === 0) {
		return i18n.baseText('settings.promotions.apply.newProjects.button');
	}
	return i18n.baseText('settings.promotions.apply.newProjects.dialog.confirm', {
		adjustToNumber: selectedCount.value,
		interpolate: { count: selectedCount.value },
	});
});

function toggle(id: string, checked: boolean) {
	const next = new Set(selectedIds.value);
	if (checked) next.add(id);
	else next.delete(id);
	selectedIds.value = next;
}

function toggleAll(checked: boolean) {
	selectedIds.value = checked ? new Set(props.projects.map((project) => project.id)) : new Set();
}

function keepUser(user: SelectUser) {
	if (keptUsers.value.some((item) => item.id === user.id)) return;
	keptUsers.value = [...keptUsers.value, user];
}

function rememberUser(id: string) {
	const user = searchResults.value.find((item) => item.id === id);
	if (user) keepUser(user);
}

function onAdmin(projectId: string, value: string) {
	admins.value = { ...admins.value, [projectId]: value };
	rememberUser(value);
}

function close() {
	emit('update:open', false);
}

function submit() {
	const chosen = props.projects.filter((project) => selectedIds.value.has(project.id));
	if (!canConfirm.value || chosen.length === 0) return;

	toast.showMessage({
		title: i18n.baseText('settings.promotions.apply.newProjects.toast.title', {
			adjustToNumber: chosen.length,
			interpolate: { count: chosen.length },
		}),
		type: 'success',
	});
	close();
}

async function searchUsers(query: string) {
	isLoadingUsers.value = true;
	try {
		const filter: { fullText?: string } = {};
		if (query.trim()) filter.fullText = query;
		const items = await usersStore.fetchUsers({ take: 50, filter });
		searchResults.value = (items ?? []).flatMap((user) => {
			if (!user.email) return [];
			return [
				{
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					fullName: user.fullName ?? undefined,
				},
			];
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('projects.settings.users.search.error'));
	} finally {
		isLoadingUsers.value = false;
	}
}

const debouncedUserSearch = useDebounceFn(searchUsers, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

onMounted(() => {
	void searchUsers('');
});
</script>

<template>
	<N8nDialog
		:open="open"
		size="large"
		:aria-description="bodyText"
		data-test-id="apply-new-projects-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('settings.promotions.apply.newProjects.dialog.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<form id="apply-new-projects-form" :class="$style.body" @submit.prevent="submit">
				<N8nText color="text-base">{{ bodyText }}</N8nText>
				<N8nTableBase>
					<thead>
						<tr>
							<th>
								<N8nCheckbox
									:model-value="allSelected"
									:indeterminate="someSelected"
									:aria-label="
										i18n.baseText('settings.promotions.apply.newProjects.dialog.selectAll')
									"
									data-test-id="apply-new-projects-select-all"
									@update:model-value="toggleAll(Boolean($event))"
								/>
							</th>
							<th :style="{ width: '40%' }">
								{{ i18n.baseText('settings.promotions.apply.newProjects.dialog.project') }}
							</th>
							<th :style="{ width: '60%' }">
								<span :class="$style.columnTitle">
									{{ i18n.baseText('settings.promotions.apply.newProjects.dialog.admin') }}
								</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="project in projects" :key="project.id" data-test-id="apply-new-projects-row">
							<td>
								<N8nCheckbox
									:model-value="selectedIds.has(project.id)"
									:aria-label="
										i18n.baseText('settings.promotions.apply.newProjects.dialog.selectProject', {
											interpolate: { name: project.name },
										})
									"
									:data-test-id="`apply-new-projects-checkbox-${project.id}`"
									@update:model-value="toggle(project.id, Boolean($event))"
								/>
							</td>
							<td>
								<N8nText bold color="text-dark">{{ project.name }}</N8nText>
							</td>
							<td>
								<!-- Same picker as project members: type a name or email, or choose a user. A typed email that is not an account stays as the value. -->
								<N8nUserSelect
									:model-value="admins[project.id] ?? ''"
									:users="usersForSelect"
									:current-user-id="usersStore.currentUser?.id"
									:placeholder="
										i18n.baseText('settings.promotions.apply.newProjects.dialog.adminPlaceholder')
									"
									size="medium"
									remote
									clearable
									show-avatar
									allow-create
									:teleported="false"
									:remote-method="debouncedUserSearch"
									:loading="isLoadingUsers"
									:data-test-id="`apply-new-projects-admin-${project.id}`"
									@update:model-value="onAdmin(project.id, String($event ?? ''))"
								/>
							</td>
						</tr>
					</tbody>
				</N8nTableBase>
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="apply-new-projects-cancel"
				@click="close"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nTooltip :disabled="canConfirm" :content="confirmDisabledReason">
				<!-- A disabled button does not receive hover, so the button lets the tooltip catch it. -->
				<N8nButton
					type="submit"
					form="apply-new-projects-form"
					:class="{ [$style.passHover]: !canConfirm }"
					:disabled="!canConfirm"
					data-test-id="apply-new-projects-confirm"
				>
					{{ confirmLabel }}
				</N8nButton>
			</N8nTooltip>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.passHover {
	pointer-events: none;
}

/* The table capitalizes header text. This title keeps its own casing. */
.columnTitle {
	text-transform: none;
}
</style>
