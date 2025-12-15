<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, onMounted } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTemplatesStore } from '../stores/templates.store';

const router = useRouter();
const workflowsStore = useWorkflowsStore();
const templatesStore = useTemplatesStore();

onMounted(async () => {
	templatesStore.fetchTemplates();
});

// ✅ Read from n8n store
const loading = computed(() => workflowsStore.isLoading);

// Filter to published templates
const templates = computed(() => {
	return templatesStore.getTemplates();
});

function useTemplate(id: string) {
	router.push(`/workflow/${id}`);
}
</script>

<template>
	<div class="templates-page">
		<header class="header">
			<h1 class="title">Workflow Templates</h1>
			<p class="subtitle">Published workflow templates available to everyone.</p>
		</header>

		<section v-if="loading">
			<p class="subtitle">Loading...</p>
		</section>

		<section v-else-if="templates.length === 0">
			<p class="subtitle">
				No templates published yet. Click "Publish" on a workflow in My Workflows to add it here.
			</p>
		</section>

		<section v-else class="grid">
			<article v-for="template in templates" :key="template.id" class="card">
				<div class="card-icon">
					<span class="icon-square" />
				</div>

				<div class="card-body">
					<h2 class="card-title">{{ template.name || 'Untitled workflow' }}</h2>
					<p class="card-description">{{ template.description || 'Untitled workflow' }}</p>
					<p class="card-meta">
						Last updated at
						{{ new Date(template.updatedAt || template.createdAt).toLocaleString() }}
					</p>
					<p class="card-meta">
						Last updated by
						{{ template.authorName }}
					</p>
				</div>

				<div class="card-footer">
					<button type="button" class="btn-primary" @click="useTemplate(template.workflowId)">
						Use Template
					</button>
				</div>
			</article>
		</section>
	</div>
</template>

<style scoped>
.templates-page {
	padding: 32px 40px;
	max-width: 1120px;
	margin: 0;
	background: var(--color-background-base);
}

.header {
	margin-bottom: 24px;
}

.title {
	font-size: 26px;
	font-weight: 600;
	color: var(--color-text-primary);
	margin-bottom: 4px;
}

.subtitle {
	font-size: 14px;
	color: var(--color-text-secondary);
}

.grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 20px 24px;
}

.card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 20px 20px 16px;
	border-radius: 12px;
	border: 1px solid var(--color-border-base);
	background-color: var(--color-background-base);
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
}

.card-icon {
	margin-bottom: 12px;
}

.icon-square {
	display: inline-block;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	background: var(--color-background-secondary);
	position: relative;
}

.icon-square::before,
.icon-square::after {
	content: '';
	position: absolute;
	width: 12px;
	height: 12px;
	border-radius: 4px;
	border: 2px solid var(--color-primary);
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.icon-square::after {
	transform: translate(-10px, -50%);
}

.card-body {
	margin-bottom: 16px;
}

.card-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--color-text-primary);
	margin-bottom: 2px;
}

.card-description {
	font-size: 13px;
	color: var(--color-text-secondary);
	margin-bottom: 4px;
}

.card-meta {
	font-size: 11px;
	color: var(--color-text-secondary);
}

.card-footer {
	display: flex;
	justify-content: flex-start;
}

.btn-primary {
	padding: 8px 18px;
	border-radius: 999px;
	border: none;
	background-color: var(--color-primary);
	color: var(--color-background-base);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
}

.btn-primary:hover {
	background-color: var(--color-primary);
	filter: brightness(0.95);
}

@media (max-width: 1100px) {
	.grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 800px) {
	.templates-page {
		padding: 24px 20px;
	}

	.grid {
		grid-template-columns: 1fr;
	}
}
</style>
