<script setup lang="ts">
import { useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useAgentLibraryStore } from '@src/stores/agentLibrary.store';

const router = useRouter();
const workflowsStore = useWorkflowsStore();
const agentLibraryStore = useAgentLibraryStore();

// UI State
const searchQuery = ref('');
const activeCategory = ref('all');

// Categories from wireframe
const categories = [
	{ id: 'all', label: 'All agents' },
	{ id: 'inventory', label: 'Inventory' },
	{ id: 'customer', label: 'Customer' },
	{ id: 'supply-chain', label: 'Supply Chain' },
	{ id: 'analytics', label: 'Analytics' },
	{ id: 'more', label: 'More' },
];

// Category → color class
const categoryColorMap: Record<string, string> = {
	inventory: 'pill-inventory',
	customer: 'pill-customer',
	'supply chain': 'pill-supply',
	'supply-chain': 'pill-supply',
	analytics: 'pill-analytics',
};

onMounted(async () => {
	await agentLibraryStore.fetchAgents();
});

const loading = computed(() => workflowsStore.isLoading);

const allAgents = computed(() => agentLibraryStore.getAgents() || []);

// Filter agents by category and search
const filteredAgents = computed(() => {
	let result = allAgents.value;

	if (activeCategory.value !== 'all') {
		result = result.filter((agent: any) => {
			const raw = agent.category || agent.tags?.[0]?.toLowerCase() || 'more';
			const normalized = raw.toString().toLowerCase();
			return normalized.includes(activeCategory.value);
		});
	}

	if (searchQuery.value.trim()) {
		const q = searchQuery.value.toLowerCase();
		result = result.filter((agent: any) => {
			return (
				agent.name?.toLowerCase().includes(q) ||
				agent.description?.toLowerCase().includes(q) ||
				agent.authorName?.toLowerCase().includes(q)
			);
		});
	}

	return result;
});

function openAgent(workflowId: string) {
	if (!workflowId) return;
	router.push(`/workflow/${workflowId}`);
}

function publishAgent() {
	router.push({ name: 'CreateAgent' });
}

function handleCategoryClick(categoryId: string) {
	activeCategory.value = categoryId;
}

function getCategoryClass(agent: any) {
	const raw = agent.category || agent.tags?.[0]?.toLowerCase() || 'General';
	const key = raw.toString().toLowerCase();
	return categoryColorMap[key] || 'pill-default';
}
</script>

<template>
	<div class="agent-library-page">
		<!-- Header -->
		<header class="header">
			<div class="header-top">
				<div class="header-title-section">
					<h1 class="page-title">Agent Library</h1>
					<p class="page-subtitle">Discover and deploy pre-built automation agents</p>
				</div>
				<button type="button" class="btn-publish" @click="publishAgent">Publish Agent</button>
			</div>

			<!-- Search Bar -->
			<div class="search-container">
				<input
					v-model="searchQuery"
					type="text"
					class="search-input"
					placeholder="Search agents..."
				/>
			</div>

			<!-- Category Tabs -->
			<div class="categories-container">
				<div class="categories-tabs">
					<button
						v-for="category in categories"
						:key="category.id"
						type="button"
						class="category-tab"
						:class="{ active: activeCategory === category.id }"
						@click="handleCategoryClick(category.id)"
					>
						{{ category.label }}
					</button>
				</div>
				<p class="agents-count">{{ filteredAgents.length }} agents</p>
			</div>
		</header>

		<!-- Content -->
		<main class="content">
			<!-- Loading -->
			<section v-if="loading" class="loading-section">
				<p class="loading-text">Loading agents...</p>
			</section>

			<!-- Empty -->
			<section v-else-if="filteredAgents.length === 0" class="empty-section">
				<p class="empty-text">
					{{
						searchQuery ? 'No agents match your search.' : 'No agents available in this category.'
					}}
				</p>
			</section>

			<!-- Agents Grid -->
			<section v-else class="agents-grid">
				<article
					v-for="agent in filteredAgents"
					:key="agent.id"
					class="agent-card"
					@click="openAgent(agent.workflowId)"
				>
					<!-- Top row: title + small circular icon -->
					<div class="agent-card-header">
						<h2 class="agent-card-title">
							{{ agent.name || 'Untitled agent' }}
						</h2>
						<button
							type="button"
							class="agent-card-icon-btn"
							@click.stop="openAgent(agent.workflowId)"
							aria-label="Open agent"
						>
							<span class="agent-card-icon-dot" />
						</button>
					</div>

					<div class="agent-card-divider" />

					<!-- Description -->
					<p class="agent-card-description">
						{{ agent.description || 'AI-powered automation agent with configurable workflows.' }}
					</p>

					<!-- Category pill -->
					<div class="agent-card-category-row">
						<span class="agent-card-category-pill" :class="getCategoryClass(agent)">
							{{ agent.category || 'General' }}
						</span>
					</div>

					<!-- Bottom meta: plays + runs / installs -->
					<div class="agent-card-footer-meta">
						<span class="meta-play-icon">▶</span>
						<span class="meta-text"> {{ agent.runs?.toLocaleString() || '0' }} runs </span>
						<span class="meta-dot">•</span>
						<span class="meta-text"> {{ agent.installs?.toLocaleString() || '0' }} installs </span>
					</div>
				</article>
			</section>
		</main>
	</div>
</template>

<style scoped>
/* Page Layout */
.agent-library-page {
	min-height: 100vh;
	background-color: var(--color-background-base, #f9fafb);
	padding: 24px 56px;
}

/* Header */
.header {
	margin-bottom: 28px;
}

.header-top {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 20px;
}

.header-title-section {
	flex: 1;
}

.page-title {
	font-size: 26px;
	font-weight: 700;
	color: var(--color-text-primary, #1f2933);
	margin: 0 0 4px 0;
	letter-spacing: -0.3px;
}

.page-subtitle {
	font-size: 14px;
	color: var(--color-text-secondary, #6b7280);
	margin: 0;
}

/* Publish button */
.btn-publish {
	padding: 9px 20px;
	border-radius: 999px;
	border: none;
	background-color: var(--color-primary, #01529f);
	color: #ffffff;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	white-space: nowrap;
}

.btn-publish:hover {
	background-color: var(--color-primary-dark, #003d6b);
	box-shadow: 0 4px 12px rgba(1, 82, 159, 0.2);
}

.btn-publish:active {
	transform: translateY(1px);
}

/* Search */
.search-container {
	margin-bottom: 18px;
}

.search-input {
	width: 100%;
	max-width: 420px;
	padding: 9px 14px;
	border-radius: 999px;
	border: 1px solid var(--color-border-base, #e5e7eb);
	background-color: #ffffff;
	font-size: 14px;
	color: var(--color-text-primary, #111827);
	transition: all 0.2s ease;
}

.search-input::placeholder {
	color: var(--color-text-secondary, #9ca3af);
}

.search-input:focus {
	outline: none;
	border-color: var(--color-primary, #01529f);
	box-shadow: 0 0 0 3px rgba(1, 82, 159, 0.1);
}

/* Categories */
.categories-container {
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid var(--color-border-base, #e5e7eb);
	padding-bottom: 10px;
}

.categories-tabs {
	display: flex;
	gap: 22px;
	flex-wrap: wrap;
}

.category-tab {
	padding: 7px 0;
	border: none;
	background: none;
	color: var(--color-text-secondary, #6b7280);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	border-bottom: 2px solid transparent;
}

.category-tab:hover {
	color: var(--color-text-primary, #111827);
}

.category-tab.active {
	color: var(--color-primary, #01529f);
	border-bottom-color: var(--color-primary, #01529f);
}

.agents-count {
	font-size: 12px;
	color: var(--color-text-secondary, #6b7280);
	margin: 0;
}

/* Content */
.content {
	margin-top: 28px;
}

/* States */
.loading-section,
.empty-section {
	text-align: center;
	padding: 60px 20px;
}

.loading-text,
.empty-text {
	font-size: 14px;
	color: var(--color-text-secondary, #6b7280);
	margin: 0;
}

/* GRID – 3 wide horizontal cards like wireframe */
.agents-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 18px 20px;
}

/* Card */
.agent-card {
	padding: 18px 22px;
	border-radius: 14px;
	border: 1px solid var(--color-border-base, #e5e7eb);
	background-color: #ffffff;
	box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
	display: flex;
	flex-direction: column;
	transition:
		box-shadow 0.18s ease,
		transform 0.18s ease,
		border-color 0.18s ease;
}

.agent-card:hover {
	border-color: var(--color-primary, #01529f);
	box-shadow: 0 10px 32px rgba(148, 163, 184, 0.35);
	transform: translateY(-2px);
}

/* Header row */
.agent-card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.agent-card-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--color-text-primary, #111827);
	margin: 0;
}

.agent-card-icon-btn {
	border: none;
	background: none;
	cursor: pointer;
	padding: 0;
}

.agent-card-icon-dot {
	width: 18px;
	height: 18px;
	border-radius: 999px;
	border: 1px solid #d1d5db;
	background: #ffffff;
}

/* Divider under header */
.agent-card-divider {
	margin: 14px 0 10px;
	height: 1px;
	background-color: #e5e7eb;
}

/* Description */
.agent-card-description {
	font-size: 13px;
	color: var(--color-text-secondary, #6b7280);
	margin: 0 0 10px 0;
	line-height: 1.45;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

/* Category pill */
.agent-card-category-row {
	display: flex;
	align-items: center;
	margin-bottom: 10px;
}

.agent-card-category-pill {
	font-size: 11px;
	padding: 4px 10px;
	border-radius: 999px;
	font-weight: 500;
}

/* Default pill */
.pill-default {
	background-color: #eef2ff;
	color: #3730a3;
}

/* Category-specific colors */
.pill-inventory {
	background-color: #ecfdf3;
	color: #166534;
}

.pill-customer {
	background-color: #f5f3ff;
	color: #6d28d9;
}

.pill-supply {
	background-color: #eff6ff;
	color: #1d4ed8;
}

.pill-analytics {
	background-color: #fff7ed;
	color: #c2410c;
}

/* Footer meta */
.agent-card-footer-meta {
	margin-top: auto;
	font-size: 11px;
	color: #9ca3af;
	display: flex;
	align-items: center;
	gap: 4px;
}

.meta-play-icon {
	font-size: 10px;
}

.meta-text {
	white-space: nowrap;
}

.meta-dot {
	font-size: 10px;
}

/* Responsive */
@media (max-width: 1280px) {
	.agent-library-page {
		padding: 20px 40px;
	}

	.agents-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 768px) {
	.agent-library-page {
		padding: 16px 20px;
	}

	.header-top {
		flex-direction: column;
		gap: 16px;
		align-items: flex-start;
	}

	.btn-publish {
		align-self: flex-start;
	}

	.agents-grid {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 480px) {
	.agent-library-page {
		padding: 12px 16px;
	}

	.page-title {
		font-size: 22px;
	}
}
</style>
