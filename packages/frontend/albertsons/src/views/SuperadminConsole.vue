<script setup>
import { ref, onMounted, watch } from 'vue';

const STORAGE_KEY = 'superadmin_users';

const users = ref([]);
const showForm = ref(false);
const isEditing = ref(false);
const currentUser = ref({
	id: null,
	name: '',
	email: '',
	role: 'Manager',
	status: 'Active',
});

// Load from localStorage once
onMounted(() => {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				users.value = parsed;
			}
		}
	} catch (e) {
		console.error('Failed to load users from storage', e);
	}
});

// Persist whenever users change
watch(
	users,
	(newVal) => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
		} catch (e) {
			console.error('Failed to save users to storage', e);
		}
	},
	{ deep: true },
);

function openAddUser() {
	isEditing.value = false;
	currentUser.value = {
		id: null,
		name: '',
		email: '',
		role: 'Manager',
		status: 'Active',
	};
	showForm.value = true;
}

function openEditUser(user) {
	isEditing.value = true;
	currentUser.value = { ...user };
	showForm.value = true;
}

function saveUser() {
	if (!currentUser.value.name || !currentUser.value.email) return;

	if (isEditing.value && currentUser.value.id !== null) {
		users.value = users.value.map((u) =>
			u.id === currentUser.value.id ? { ...currentUser.value } : u,
		);
	} else {
		const nextId = users.value.length ? Math.max(...users.value.map((u) => u.id)) + 1 : 1;
		users.value.push({
			...currentUser.value,
			id: nextId,
			lastActive: 'Just now',
		});
	}
	showForm.value = false;
}

function deleteUser(id) {
	if (confirm('Delete this user?')) {
		users.value = users.value.filter((u) => u.id !== id);
	}
}
</script>

<template>
	<div class="page">
		<header class="page-header">
			<div class="page-title">
				<h1>Super Admin Console</h1>
				<p>Manage users, roles and access.</p>
			</div>
		</header>

		<div class="tabs">
			<button class="tab tab--active">Manage Users</button>
		</div>

		<section class="card">
			<div class="card-header">
				<div class="card-title">
					<h2>Manage Users</h2>
					<p>Add, edit, delete managers and set roles.</p>
				</div>
				<button class="btn-primary" @click="openAddUser">Add User</button>
			</div>

			<table class="users-table" v-if="users.length">
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Role</th>
						<th>Status</th>
						<th>Last active</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="user in users" :key="user.id">
						<td>{{ user.name }}</td>
						<td>{{ user.email }}</td>
						<td>{{ user.role }}</td>
						<td>
							<span
								class="status-pill"
								:class="user.status === 'Active' ? 'status-pill--active' : 'status-pill--disabled'"
							>
								{{ user.status }}
							</span>
						</td>
						<td>{{ user.lastActive }}</td>
						<td class="actions">
							<button class="link" @click="openEditUser(user)">Edit</button>
							<button class="link link-danger" @click="deleteUser(user.id)">Delete</button>
						</td>
					</tr>
				</tbody>
			</table>

			<div v-else class="empty-state">
				<p class="empty-title">No users yet</p>
				<p class="empty-subtitle">Add your first manager or super admin to get started.</p>
				<button class="btn-primary" @click="openAddUser">Add User</button>
			</div>
		</section>

		<!-- User form modal -->
		<div v-if="showForm" class="modal-backdrop">
			<div class="modal">
				<h3>{{ isEditing ? 'Edit User' : 'Add User' }}</h3>

				<label>
					Name
					<input v-model="currentUser.name" type="text" placeholder="Enter full name" />
				</label>

				<label>
					Email
					<input v-model="currentUser.email" type="email" placeholder="name@company.com" />
				</label>

				<div class="modal-row">
					<label>
						Role
						<select v-model="currentUser.role">
							<option>Super Admin</option>
							<option>Manager</option>
							<option>Viewer</option>
						</select>
					</label>

					<label>
						Status
						<select v-model="currentUser.status">
							<option>Active</option>
							<option>Disabled</option>
						</select>
					</label>
				</div>

				<div class="modal-actions">
					<button class="btn-secondary" @click="showForm = false">Cancel</button>
					<button class="btn-primary" @click="saveUser">
						{{ isEditing ? 'Save changes' : 'Create user' }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.page {
	padding: 24px 32px;
}

.page-title h1 {
	font-size: 20px;
	font-weight: 600;
	margin-bottom: 4px;
}

.page-title p {
	font-size: 13px;
	color: var(--color--text--tint-1);
}

/* Tabs */
.tabs {
	display: flex;
	gap: 8px;
	margin-top: 12px;
	margin-bottom: 12px;
	border-bottom: 1px solid var(--border-color--light);
}

.tab {
	border: none;
	background: transparent;
	padding: 8px 12px;
	font-size: 13px;
	cursor: pointer;
	border-bottom: 2px solid transparent;
	color: var(--color--text--tint-1);
}

.tab--active {
	color: var(--color--primary);
	border-bottom-color: var(--color--primary);
	font-weight: 600;
}

/* Card */
.card {
	max-width: 860px;
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: var(--border);
	padding: 16px 20px 12px;
	box-shadow: var(--shadow--light);
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
	gap: 16px;
}

.card-title h2 {
	font-size: 15px;
	font-weight: 600;
	margin-bottom: 2px;
}

.card-title p {
	font-size: 12px;
	color: var(--color--text--tint-1);
}

.btn-primary {
	padding: 6px 14px;
	min-width: 110px;
	border-radius: var(--radius);
	border: 1px solid var(--button--border-color--primary);
	background: var(--button--color--background--primary);
	color: var(--button--color--text--primary);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
}

/* Table */
.users-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;
}

.users-table th,
.users-table td {
	padding: 9px 8px;
	text-align: left;
}

.users-table thead th {
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color--text--tint-1);
	border-bottom: 1px solid var(--border-color--light);
}

.users-table tbody tr + tr {
	border-top: 1px solid var(--border-color--light);
}

.users-table tbody tr:hover {
	background: var(--color--background--light-2);
}

.actions {
	text-align: right;
}

/* Status pill */
.status-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 64px;
	padding: 2px 8px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 500;
}

.status-pill--active {
	background: rgba(16, 185, 129, 0.08);
	color: #047857;
}

.status-pill--disabled {
	background: rgba(148, 163, 184, 0.12);
	color: #4b5563;
}

/* Links */
.link {
	border: none;
	background: transparent;
	color: var(--link--color--secondary);
	font-size: 12px;
	cursor: pointer;
	margin-left: 8px;
}

.link:hover {
	text-decoration: underline;
}

.link-danger {
	color: var(--color--danger);
}

.link-danger:hover {
	color: #b91c1c;
}

/* Empty state */
.empty-state {
	padding: 24px 8px 12px;
	text-align: center;
}

.empty-title {
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 4px;
}

.empty-subtitle {
	font-size: 12px;
	color: var(--color--text--tint-1);
	margin-bottom: 12px;
}

/* Modal */
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(15, 23, 42, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 40;
}

.modal {
	width: 420px;
	max-width: 90vw;
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: var(--border);
	padding: 18px 20px 14px;
	box-shadow: var(--shadow);
}

.modal h3 {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 12px;
}

.modal label {
	display: block;
	font-size: 12px;
	color: var(--color--text--tint-1);
	margin-bottom: 10px;
}

.modal input,
.modal select {
	width: 100%;
	margin-top: 4px;
	padding: 6px 8px;
	border-radius: var(--radius);
	border: 1px solid var(--border-color--light);
	font-size: 13px;
}

.modal-row {
	display: flex;
	gap: 12px;
}

.modal-row label {
	flex: 1;
}

.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	margin-top: 14px;
}

.btn-secondary {
	padding: 6px 10px;
	border-radius: var(--radius);
	border: 1px solid var(--border-color--light);
	background: var(--color--background--light-3);
	font-size: 13px;
	cursor: pointer;
}
</style>
