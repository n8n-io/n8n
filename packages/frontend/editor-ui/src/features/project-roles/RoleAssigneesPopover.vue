<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nPopover, N8nText, N8nLoading, N8nUserInfo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { RoleAssigneeDto } from '@n8n/api-types';
import { useRolesStore } from '@/app/stores/roles.store';

const props = defineProps<{
	roleSlug: string;
	count: number;
}>();

const i18n = useI18n();
const rolesStore = useRolesStore();

const isOpen = ref(false);
const isLoading = ref(false);
const assignees = ref<RoleAssigneeDto[]>([]);

const groupedByProject = computed(() => {
	const groups = new Map<string, { projectName: string; users: RoleAssigneeDto[] }>();
	for (const assignee of assignees.value) {
		const existing = groups.get(assignee.projectId);
		if (existing) {
			existing.users.push(assignee);
		} else {
			groups.set(assignee.projectId, {
				projectName: assignee.projectName,
				users: [assignee],
			});
		}
	}
	return [...groups.values()];
});

async function handleOpenChange(open: boolean) {
	isOpen.value = open;
	if (open && assignees.value.length === 0 && props.count > 0) {
		isLoading.value = true;
		try {
			assignees.value = await rolesStore.fetchRoleAssignees(props.roleSlug);
		} finally {
			isLoading.value = false;
		}
	}
}

function handleTriggerClick(event: MouseEvent) {
	if (props.count === 0) return;
	event.stopPropagation();
	void handleOpenChange(!isOpen.value);
}
</script>

<template>
	<N8nPopover
		:open="isOpen"
		width="320px"
		max-height="400px"
		:suppress-auto-focus="true"
		@update:open="handleOpenChange"
	>
		<template #trigger>
			<N8nText
				:class="{ [$style.clickableCount]: count > 0 }"
				data-test-id="role-assignees-count"
				@click="handleTriggerClick"
			>
				{{ count }}
			</N8nText>
		</template>
		<template #content>
			<div :class="$style.container">
				<N8nText :class="$style.title" :bold="true" size="small">
					{{ i18n.baseText('projectRoles.assignees.title') }}
				</N8nText>
				<N8nLoading v-if="isLoading" :rows="3" />
				<template v-else-if="groupedByProject.length > 0">
					<div
						v-for="group in groupedByProject"
						:key="group.projectName"
						:class="$style.projectGroup"
					>
						<N8nText :class="$style.projectName" size="small" color="text-light">
							{{ group.projectName }}
						</N8nText>
						<div v-for="user in group.users" :key="user.userId" :class="$style.userRow">
							<N8nUserInfo
								:first-name="user.firstName"
								:last-name="user.lastName"
								:email="user.email"
							/>
						</div>
					</div>
				</template>
				<N8nText v-else size="small" color="text-light">
					{{ i18n.baseText('projectRoles.assignees.noAssignees') }}
				</N8nText>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="css" module>
.container {
	padding: var(--spacing--xs);
}

.title {
	display: block;
	margin-bottom: var(--spacing--2xs);
}

.clickableCount {
	cursor: pointer;
	text-decoration: underline;
	text-decoration-style: dotted;
	text-underline-offset: 2px;
}

.clickableCount:hover {
	color: var(--color--primary);
}

.projectGroup {
	margin-bottom: var(--spacing--xs);
}

.projectGroup:last-child {
	margin-bottom: 0;
}

.projectName {
	display: block;
	margin-bottom: var(--spacing--4xs);
}

.userRow {
	padding: var(--spacing--4xs) 0;
}
</style>
