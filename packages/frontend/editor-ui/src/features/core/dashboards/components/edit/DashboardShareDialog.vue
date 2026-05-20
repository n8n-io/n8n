<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nButton, N8nOption, N8nSelect, N8nText, N8nIcon } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/features/settings/users/users.store';

import {
	shareDashboardApi,
	unshareDashboardApi,
	type DashboardShare,
} from '@/features/core/dashboards/dashboards.api';

const props = defineProps<{
	open: boolean;
	dashboardId: string;
	dashboardName: string;
	projectId: string;
}>();

const emit = defineEmits<{
	(e: 'close'): void;
}>();

const rootStore = useRootStore();
const usersStore = useUsersStore();

const shares = ref<DashboardShare[]>([]);
const adding = ref(false);
const addUserId = ref('');
const addRole = ref<'viewer' | 'editor'>('viewer');
const error = ref('');
const saving = ref(false);

// Resolve a userId → display name+email from the cached users store. Falls
// back to the raw id when we can't find the user.
function userDisplay(userId: string): { name: string; email: string } {
	const user = usersStore.allUsers.find((u: { id: string }) => u.id === userId);
	if (!user) return { name: userId, email: '' };
	const first = user.firstName ?? '';
	const last = user.lastName ?? '';
	const name = (first || last ? `${first} ${last}`.trim() : user.email) ?? userId;
	return { name, email: user.email ?? '' };
}

watch(
	() => props.open,
	(open) => {
		if (open) reset();
	},
);

function reset() {
	shares.value = [];
	addUserId.value = '';
	addRole.value = 'viewer';
	adding.value = false;
	error.value = '';
}

async function addShare() {
	if (!addUserId.value.trim()) return;
	saving.value = true;
	error.value = '';
	try {
		const next = await shareDashboardApi(
			rootStore.restApiContext,
			props.projectId,
			props.dashboardId,
			{ shareWithIds: [addUserId.value.trim()], role: addRole.value },
		);
		shares.value = next;
		addUserId.value = '';
		adding.value = false;
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		saving.value = false;
	}
}

async function removeShare(userId: string) {
	saving.value = true;
	error.value = '';
	try {
		await unshareDashboardApi(rootStore.restApiContext, props.projectId, props.dashboardId, userId);
		shares.value = shares.value.filter((s) => s.userId !== userId);
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
	} finally {
		saving.value = false;
	}
}

// Other users in the org that could be added — anyone we have a user record
// for who isn't already a share or the current user.
const otherUsers = () =>
	usersStore.allUsers.filter(
		(u: { id: string }) =>
			u.id !== usersStore.currentUserId && !shares.value.some((s) => s.userId === u.id),
	);
</script>

<template>
	<div v-if="open" class="share-backdrop" @click.self="emit('close')">
		<div class="share-dialog" role="dialog" aria-modal="true">
			<header class="share-dialog__header">
				<div class="share-dialog__title">
					<N8nText tag="h3" size="medium" bold>Share dashboard</N8nText>
					<N8nText size="xsmall" color="text-light">{{ dashboardName }}</N8nText>
				</div>
				<N8nButton type="tertiary" size="mini" icon="circle-x" label="" @click="emit('close')" />
			</header>

			<div class="share-dialog__body">
				<section class="share-dialog__section">
					<N8nText size="small" color="text-light">People with access</N8nText>
					<ul class="share-dialog__list">
						<li v-for="share in shares" :key="share.userId" class="share-dialog__row">
							<span class="share-dialog__person">
								<span class="share-dialog__avatar">
									<N8nIcon icon="user-round" size="xsmall" />
								</span>
								<span class="share-dialog__person-text">
									<strong>{{ userDisplay(share.userId).name }}</strong>
									<span v-if="userDisplay(share.userId).email">
										{{ userDisplay(share.userId).email }}
									</span>
								</span>
							</span>
							<span class="share-dialog__role">{{ share.role }}</span>
							<button
								class="share-dialog__icon-btn"
								title="Revoke"
								@click="removeShare(share.userId)"
							>
								<N8nIcon icon="trash-2" size="xsmall" />
							</button>
						</li>
						<li v-if="shares.length === 0" class="share-dialog__empty">
							Only project members can see this dashboard. Add specific people below to grant viewer
							or editor access.
						</li>
					</ul>
				</section>

				<section v-if="adding" class="share-dialog__add">
					<div class="share-dialog__add-row">
						<N8nSelect v-model="addUserId" filterable placeholder="Pick a user">
							<N8nOption
								v-for="u in otherUsers()"
								:key="u.id"
								:value="u.id"
								:label="`${u.firstName ?? ''} ${u.lastName ?? ''} (${u.email})`"
							/>
						</N8nSelect>
						<N8nSelect v-model="addRole" class="share-dialog__role-select">
							<N8nOption value="viewer" label="Viewer" />
							<N8nOption value="editor" label="Editor" />
						</N8nSelect>
					</div>
					<div class="share-dialog__add-actions">
						<N8nButton type="tertiary" label="Cancel" size="small" @click="adding = false" />
						<N8nButton
							type="primary"
							label="Add"
							size="small"
							:loading="saving"
							:disabled="!addUserId"
							@click="addShare"
						/>
					</div>
				</section>

				<N8nButton
					v-else
					type="tertiary"
					icon="circle-plus"
					label="Add person"
					size="small"
					@click="adding = true"
				/>

				<div v-if="error" class="share-dialog__error">{{ error }}</div>
			</div>

			<footer class="share-dialog__footer">
				<N8nButton type="primary" label="Done" @click="emit('close')" />
			</footer>
		</div>
	</div>
</template>

<style scoped lang="scss">
.share-backdrop {
	position: fixed;
	inset: 0;
	background: var(--color--black-alpha-500);
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
}

.share-dialog {
	width: 100%;
	max-width: 480px;
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	box-shadow: var(--shadow--dark);
	display: flex;
	flex-direction: column;
	max-height: 80vh;
}

.share-dialog__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.share-dialog__title {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.share-dialog__body {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.share-dialog__section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.share-dialog__list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.share-dialog__row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs);
}

.share-dialog__person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.share-dialog__avatar {
	width: 26px;
	height: 26px;
	border-radius: var(--radius--full);
	background: var(--color--background--shade-1);
	color: var(--color--text--shade-1);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.share-dialog__person-text {
	display: flex;
	flex-direction: column;
	gap: 1px;
	min-width: 0;
	font-size: var(--font-size--xs);
}

.share-dialog__person-text strong {
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--medium);
}

.share-dialog__person-text span {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
}

.share-dialog__role {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	text-transform: capitalize;
	padding: 2px 8px;
	background: var(--color--background--shade-1);
	border-radius: var(--radius--full);
}

.share-dialog__icon-btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius--3xs);
	color: var(--color--text--tint-1);
}

.share-dialog__icon-btn:hover {
	background: var(--color--red-50);
	color: var(--color--text--danger);
}

.share-dialog__empty {
	padding: var(--spacing--xs);
	background: var(--color--background--light-2);
	border-radius: var(--radius--3xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.share-dialog__add {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs);
}

.share-dialog__add-row {
	display: grid;
	grid-template-columns: 1fr 120px;
	gap: var(--spacing--2xs);
}

.share-dialog__role-select {
	min-width: 0;
}

.share-dialog__add-actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.share-dialog__error {
	color: var(--color--text--danger);
	font-size: var(--font-size--2xs);
}

.share-dialog__footer {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: 1px solid var(--color--foreground--tint-1);
}
</style>
