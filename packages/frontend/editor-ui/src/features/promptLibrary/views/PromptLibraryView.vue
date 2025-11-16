<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	N8nButton,
	N8nHeading,
	N8nText,
	N8nModal,
	N8nInput,
	N8nSelect,
	N8nCheckbox,
	N8nLoading,
	N8nCard,
} from '@n8n/design-system';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useDocumentTitle } from '@/composables/useDocumentTitle';

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();

documentTitle.set(i18n.baseText('promptLibrary.title'));

interface Prompt {
	id: string;
	name: string;
	content: string;
	description: string;
	category: string;
	tags: string;
	version: string;
	availableInMCP: boolean;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
}

const prompts = ref<Prompt[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showViewModal = ref(false);
const editingPrompt = ref<Prompt | null>(null);
const viewingPrompt = ref<Prompt | null>(null);

// Form data
const formData = ref({
	name: '',
	content: '',
	description: '',
	category: 'general',
	tags: '',
	version: '1.0.0',
	availableInMCP: true,
});

const categoryOptions = [
	{ label: i18n.baseText('promptLibrary.category.general'), value: 'general' },
	{ label: i18n.baseText('promptLibrary.category.coding'), value: 'coding' },
	{ label: i18n.baseText('promptLibrary.category.analysis'), value: 'analysis' },
	{ label: i18n.baseText('promptLibrary.category.writing'), value: 'writing' },
	{ label: i18n.baseText('promptLibrary.category.testing'), value: 'testing' },
];

const isEditing = computed(() => editingPrompt.value !== null);
const modalTitle = computed(() =>
	isEditing.value ? i18n.baseText('promptLibrary.editPrompt') : i18n.baseText('promptLibrary.createPrompt'),
);

// Fetch prompts from Data Tables
async function fetchPrompts() {
	loading.value = true;
	try {
		const projectId = rootStore.currentProject?.id;
		if (!projectId) throw new Error('No project selected');

		// GET /projects/{projectId}/data-tables (filter by name: mcp_prompts)
		const response = await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/projects/${projectId}/data-tables`,
			{ filter: JSON.stringify({ name: 'mcp_prompts' }) },
		);

		const tables = response.data || [];

		if (tables.length === 0) {
			prompts.value = [];
			return;
		}

		const table = tables[0];

		// GET /projects/{projectId}/data-tables/{tableId}/rows
		const rowsResponse = await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/projects/${projectId}/data-tables/${table.id}/rows`,
		);

		prompts.value = rowsResponse.rows || [];
	} catch (error) {
		toast.showError(error, i18n.baseText('promptLibrary.error.fetchFailed'));
	} finally {
		loading.value = false;
	}
}

async function ensurePromptsTable(projectId: string) {
	try {
		const response = await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/projects/${projectId}/data-tables`,
			{ filter: JSON.stringify({ name: 'mcp_prompts' }) },
		);

		const tables = response.data || [];

		if (tables.length > 0) return tables[0].id;

		// Create table
		const createResponse = await makeRestApiRequest(
			rootStore.restApiContext,
			'POST',
			`/projects/${projectId}/data-tables`,
			{
				name: 'mcp_prompts',
				columns: [
					{ name: 'name', type: 'string', index: 0 },
					{ name: 'content', type: 'string', index: 1 },
					{ name: 'description', type: 'string', index: 2 },
					{ name: 'category', type: 'string', index: 3 },
					{ name: 'tags', type: 'string', index: 4 },
					{ name: 'version', type: 'string', index: 5 },
					{ name: 'availableInMCP', type: 'boolean', index: 6 },
					{ name: 'isPublic', type: 'boolean', index: 7 },
				],
			},
		);

		return createResponse.id;
	} catch (error) {
		throw error;
	}
}

async function savePrompt() {
	try {
		const projectId = rootStore.currentProject?.id;
		if (!projectId) throw new Error('No project selected');

		const tableId = await ensurePromptsTable(projectId);

		if (isEditing.value && editingPrompt.value) {
			// Update existing prompt
			await makeRestApiRequest(
				rootStore.restApiContext,
				'PATCH',
				`/projects/${projectId}/data-tables/${tableId}/rows`,
				{
					filter: {
						type: 'and',
						filters: [{ columnName: 'id', condition: 'eq', value: editingPrompt.value.id }],
					},
					data: formData.value,
				},
			);

			toast.showMessage({
				title: i18n.baseText('promptLibrary.success'),
				message: i18n.baseText('promptLibrary.promptUpdated'),
				type: 'success',
			});
		} else {
			// Create new prompt
			await makeRestApiRequest(
				rootStore.restApiContext,
				'POST',
				`/projects/${projectId}/data-tables/${tableId}/insert`,
				{ data: [formData.value] },
			);

			toast.showMessage({
				title: i18n.baseText('promptLibrary.success'),
				message: i18n.baseText('promptLibrary.promptCreated'),
				type: 'success',
			});
		}

		showCreateModal.value = false;
		resetForm();
		await fetchPrompts();
	} catch (error) {
		toast.showError(error, i18n.baseText('promptLibrary.error.saveFailed'));
	}
}

async function deletePrompt(prompt: Prompt) {
	try {
		const confirmed = await message.confirm(
			i18n.baseText('promptLibrary.deleteConfirm', { interpolate: { name: prompt.name } }),
			i18n.baseText('promptLibrary.deletePrompt'),
			{
				confirmButtonText: i18n.baseText('promptLibrary.delete'),
				cancelButtonText: i18n.baseText('promptLibrary.cancel'),
			},
		);

		if (!confirmed) return;

		const projectId = rootStore.currentProject?.id;
		if (!projectId) throw new Error('No project selected');

		const response = await makeRestApiRequest(
			rootStore.restApiContext,
			'GET',
			`/projects/${projectId}/data-tables`,
			{ filter: JSON.stringify({ name: 'mcp_prompts' }) },
		);

		const tables = response.data || [];
		if (tables.length === 0) return;

		const tableId = tables[0].id;

		await makeRestApiRequest(
			rootStore.restApiContext,
			'DELETE',
			`/projects/${projectId}/data-tables/${tableId}/rows`,
			{
				filter: {
					type: 'and',
					filters: [{ columnName: 'id', condition: 'eq', value: prompt.id }],
				},
			},
		);

		toast.showMessage({
			title: i18n.baseText('promptLibrary.success'),
			message: i18n.baseText('promptLibrary.promptDeleted'),
			type: 'success',
		});

		await fetchPrompts();
	} catch (error) {
		toast.showError(error, i18n.baseText('promptLibrary.error.deleteFailed'));
	}
}

function editPrompt(prompt: Prompt) {
	editingPrompt.value = prompt;
	formData.value = {
		name: prompt.name,
		content: prompt.content,
		description: prompt.description,
		category: prompt.category,
		tags: prompt.tags,
		version: prompt.version,
		availableInMCP: prompt.availableInMCP,
	};
	showCreateModal.value = true;
}

function viewPrompt(prompt: Prompt) {
	viewingPrompt.value = prompt;
	showViewModal.value = true;
}

function resetForm() {
	formData.value = {
		name: '',
		content: '',
		description: '',
		category: 'general',
		tags: '',
		version: '1.0.0',
		availableInMCP: true,
	};
	editingPrompt.value = null;
}

function getCategoryLabel(category: string) {
	const option = categoryOptions.find((opt) => opt.value === category);
	return option ? option.label : category;
}

onMounted(() => {
	fetchPrompts();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div>
				<N8nHeading tag="h2">{{ i18n.baseText('promptLibrary.title') }}</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('promptLibrary.description') }}
				</N8nText>
			</div>
			<N8nButton @click="showCreateModal = true" icon="plus" size="large">
				{{ i18n.baseText('promptLibrary.createPrompt') }}
			</N8nButton>
		</div>

		<N8nLoading v-if="loading" :loading="loading" />

		<div v-else-if="prompts.length === 0" :class="$style.empty">
			<N8nText size="large" color="text-light">
				{{ i18n.baseText('promptLibrary.noPrompts') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('promptLibrary.createFirst') }}
			</N8nText>
		</div>

		<div v-else :class="$style.promptGrid">
			<N8nCard
				v-for="prompt in prompts"
				:key="prompt.id"
				:class="$style.promptCard"
				hoverable
				@click="viewPrompt(prompt)"
			>
				<template #header>
					<div :class="$style.cardHeader">
						<N8nHeading tag="h3" size="small">{{ prompt.name }}</N8nHeading>
						<span :class="$style.category">{{ getCategoryLabel(prompt.category) }}</span>
					</div>
				</template>

				<N8nText size="small" color="text-base">{{ prompt.description || i18n.baseText('promptLibrary.noDescription') }}</N8nText>

				<div :class="$style.promptMeta">
					<span :class="$style.version">v{{ prompt.version }}</span>
					<span v-if="prompt.tags" :class="$style.tags">{{ prompt.tags }}</span>
					<span v-if="prompt.availableInMCP" :class="$style.mcpBadge">MCP</span>
				</div>

				<template #footer>
					<div :class="$style.cardActions" @click.stop>
						<N8nButton size="small" type="tertiary" icon="edit" @click="editPrompt(prompt)">
							{{ i18n.baseText('promptLibrary.edit') }}
						</N8nButton>
						<N8nButton size="small" type="tertiary" icon="trash" @click="deletePrompt(prompt)">
							{{ i18n.baseText('promptLibrary.delete') }}
						</N8nButton>
					</div>
				</template>
			</N8nCard>
		</div>

		<!-- Create/Edit Modal -->
		<N8nModal
			v-model="showCreateModal"
			:title="modalTitle"
			width="800px"
			@close="resetForm"
		>
			<template #content>
				<div :class="$style.form">
					<N8nInput
						v-model="formData.name"
						:label="i18n.baseText('promptLibrary.form.name')"
						:placeholder="i18n.baseText('promptLibrary.form.namePlaceholder')"
						required
						:disabled="isEditing"
					/>
					<N8nInput
						v-model="formData.content"
						type="textarea"
						:label="i18n.baseText('promptLibrary.form.content')"
						:placeholder="i18n.baseText('promptLibrary.form.contentPlaceholder')"
						required
						:rows="10"
					/>
					<N8nInput
						v-model="formData.description"
						:label="i18n.baseText('promptLibrary.form.description')"
						:placeholder="i18n.baseText('promptLibrary.form.descriptionPlaceholder')"
					/>
					<N8nSelect
						v-model="formData.category"
						:label="i18n.baseText('promptLibrary.form.category')"
						:options="categoryOptions"
					/>
					<N8nInput
						v-model="formData.tags"
						:label="i18n.baseText('promptLibrary.form.tags')"
						:placeholder="i18n.baseText('promptLibrary.form.tagsPlaceholder')"
					/>
					<N8nInput
						v-model="formData.version"
						:label="i18n.baseText('promptLibrary.form.version')"
						placeholder="1.0.0"
					/>
					<N8nCheckbox
						v-model="formData.availableInMCP"
						:label="i18n.baseText('promptLibrary.form.availableInMCP')"
					/>
				</div>
			</template>
			<template #footer>
				<N8nButton @click="showCreateModal = false; resetForm()" type="secondary">
					{{ i18n.baseText('promptLibrary.cancel') }}
				</N8nButton>
				<N8nButton @click="savePrompt">
					{{ isEditing ? i18n.baseText('promptLibrary.update') : i18n.baseText('promptLibrary.create') }}
				</N8nButton>
			</template>
		</N8nModal>

		<!-- View Modal -->
		<N8nModal
			v-model="showViewModal"
			:title="viewingPrompt?.name || ''"
			width="800px"
		>
			<template #content>
				<div v-if="viewingPrompt" :class="$style.viewContent">
					<div :class="$style.viewMeta">
						<span :class="$style.category">{{ getCategoryLabel(viewingPrompt.category) }}</span>
						<span :class="$style.version">v{{ viewingPrompt.version }}</span>
						<span v-if="viewingPrompt.availableInMCP" :class="$style.mcpBadge">MCP Enabled</span>
					</div>

					<N8nText v-if="viewingPrompt.description" size="small" color="text-light" :class="$style.viewDescription">
						{{ viewingPrompt.description }}
					</N8nText>

					<div :class="$style.viewSection">
						<N8nHeading tag="h4" size="small">{{ i18n.baseText('promptLibrary.content') }}</N8nHeading>
						<pre :class="$style.promptContent">{{ viewingPrompt.content }}</pre>
					</div>

					<div v-if="viewingPrompt.tags" :class="$style.viewSection">
						<N8nHeading tag="h4" size="small">{{ i18n.baseText('promptLibrary.tags') }}</N8nHeading>
						<N8nText size="small">{{ viewingPrompt.tags }}</N8nText>
					</div>

					<div :class="$style.viewSection">
						<N8nHeading tag="h4" size="small">{{ i18n.baseText('promptLibrary.mcpUri') }}</N8nHeading>
						<code :class="$style.mcpUri">prompts://{{ rootStore.currentProject?.id }}/{{ viewingPrompt.name }}</code>
					</div>
				</div>
			</template>
			<template #footer>
				<N8nButton @click="showViewModal = false" type="secondary">
					{{ i18n.baseText('promptLibrary.close') }}
				</N8nButton>
				<N8nButton v-if="viewingPrompt" @click="editPrompt(viewingPrompt); showViewModal = false">
					{{ i18n.baseText('promptLibrary.edit') }}
				</N8nButton>
			</template>
		</N8nModal>
	</div>
</template>

<style module lang="scss">
.container {
	padding: var(--spacing-l);
	max-width: 1400px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing-xl);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing-3xl) var(--spacing-xl);
	text-align: center;
	gap: var(--spacing-xs);
}

.promptGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
	gap: var(--spacing-m);
}

.promptCard {
	cursor: pointer;
	transition: transform 0.2s ease;

	&:hover {
		transform: translateY(-2px);
	}
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing-xs);
}

.category {
	font-size: var(--font-size-2xs);
	padding: var(--spacing-4xs) var(--spacing-xs);
	background: var(--color-primary-tint-3);
	border-radius: var(--border-radius-base);
	white-space: nowrap;
}

.promptMeta {
	margin-top: var(--spacing-s);
	display: flex;
	gap: var(--spacing-xs);
	align-items: center;
	flex-wrap: wrap;
	font-size: var(--font-size-2xs);
	color: var(--color-text-light);
}

.version {
	padding: var(--spacing-4xs) var(--spacing-xs);
	background: var(--color-background-medium);
	border-radius: var(--border-radius-base);
}

.tags {
	font-style: italic;
}

.mcpBadge {
	padding: var(--spacing-4xs) var(--spacing-xs);
	background: var(--color-success-tint-2);
	color: var(--color-success-shade-1);
	border-radius: var(--border-radius-base);
	font-weight: var(--font-weight-bold);
}

.cardActions {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.viewContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.viewMeta {
	display: flex;
	gap: var(--spacing-xs);
	align-items: center;
	flex-wrap: wrap;
}

.viewDescription {
	padding: var(--spacing-s);
	background: var(--color-background-light);
	border-radius: var(--border-radius-base);
}

.viewSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.promptContent {
	background: var(--color-background-light);
	padding: var(--spacing-m);
	border-radius: var(--border-radius-base);
	white-space: pre-wrap;
	font-family: monospace;
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-xloose);
	max-height: 400px;
	overflow-y: auto;
}

.mcpUri {
	padding: var(--spacing-s);
	background: var(--color-background-light);
	border-radius: var(--border-radius-base);
	font-family: monospace;
	font-size: var(--font-size-xs);
	display: block;
	word-break: break-all;
}
</style>
