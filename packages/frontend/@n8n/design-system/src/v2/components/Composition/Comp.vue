<script lang="ts" setup>
import { ref } from 'vue';

import { N8nIconButton } from '@n8n/design-system/components';
import type { IMenuItem } from '@n8n/design-system/types';

import MenuItem from '../MenuItem/MenuItem.vue';
import { Tree } from '../Tree';

const items = ref<IMenuItem[]>([
	{
		id: 'neural-networks',
		label: 'Neural Networks',
		icon: { type: 'emoji', value: '🧠' },
		children: [
			{ id: 'models', label: 'Models', icon: 'folder' },
			{ id: 'training', label: 'Training', icon: 'folder' },
			{ id: 'datasets', label: 'Datasets', icon: 'folder' },
		],
	},
	{
		id: 'machine-learning',
		label: 'Machine Learning',
		icon: { type: 'emoji', value: '🤖' },
		children: [
			{ id: 'algorithms', label: 'Algorithms', icon: 'folder' },
			{ id: 'preprocessing', label: 'Preprocessing', icon: 'folder' },
			{ id: 'evaluation', label: 'Evaluation', icon: 'folder' },
			{ id: 'pipelines', label: 'Pipelines', icon: 'folder' },
		],
	},
	{
		id: 'natural-language',
		label: 'Natural Language Processing',
		icon: { type: 'emoji', value: '💬' },
		children: [
			{ id: 'tokenization', label: 'Tokenization', icon: 'folder' },
			{ id: 'embeddings', label: 'Embeddings', icon: 'folder' },
			{ id: 'transformers', label: 'Transformers', icon: 'folder' },
			{ id: 'sentiment', label: 'Sentiment Analysis', icon: 'folder' },
			{ id: 'classification', label: 'Text Classification', icon: 'folder' },
		],
	},
	{
		id: 'computer-vision',
		label: 'Computer Vision',
		icon: { type: 'emoji', value: '👁️' },
		children: [
			{ id: 'detection', label: 'Object Detection', icon: 'folder' },
			{ id: 'recognition', label: 'Image Recognition', icon: 'folder' },
		],
	},
	{
		id: 'reinforcement-learning',
		label: 'Reinforcement Learning',
		icon: { type: 'emoji', value: '🎯' },
		children: [
			{ id: 'agents', label: 'Agents', icon: 'folder' },
			{ id: 'environments', label: 'Environments', icon: 'folder' },
			{ id: 'policies', label: 'Policies', icon: 'folder' },
			{ id: 'rewards', label: 'Reward Systems', icon: 'folder' },
			{ id: 'training-loops', label: 'Training Loops', icon: 'folder' },
			{ id: 'experiments', label: 'Experiments', icon: 'folder' },
		],
	},
	{
		id: 'data-science',
		label: 'Data Science',
		icon: { type: 'emoji', value: '📊' },
		children: [
			{ id: 'analysis', label: 'Analysis', icon: 'folder' },
			{ id: 'visualization', label: 'Visualization', icon: 'folder' },
			{ id: 'statistics', label: 'Statistics', icon: 'folder' },
		],
	},
	{
		id: 'ai-automation',
		label: 'AI Automation',
		icon: { type: 'emoji', value: '⚡' },
		children: [{ id: 'workflows', label: 'Workflows', icon: 'folder' }],
	},
	{
		id: 'generative-ai',
		label: 'Generative AI',
		icon: { type: 'emoji', value: '✨' },
		children: [
			{ id: 'text-generation', label: 'Text Generation', icon: 'folder' },
			{ id: 'image-generation', label: 'Image Generation', icon: 'folder' },
			{ id: 'code-generation', label: 'Code Generation', icon: 'folder' },
			{ id: 'prompts', label: 'Prompt Engineering', icon: 'folder' },
			{ id: 'fine-tuning', label: 'Fine-tuning', icon: 'folder' },
		],
	},
]);

const collapsed = ref(false);

function toggleSidebar() {
	collapsed.value = !collapsed.value;
}
</script>

<template>
	<div class="nav" :style="{ width: collapsed ? '42px' : '250px' }">
		<div class="header">
			<div class="toggle">
				<N8nIconButton
					size="small"
					type="highlight"
					icon="panel-left"
					icon-size="large"
					aria-label="Add new item"
					@click="toggleSidebar"
				/>
			</div>
			<div v-if="!collapsed" class="actions">
				<N8nIconButton
					size="small"
					type="highlight"
					icon="plus"
					icon-size="large"
					aria-label="Add new item"
				/>
				<N8nIconButton
					size="small"
					type="highlight"
					icon="search"
					icon-size="large"
					aria-label="Add new item"
				/>
			</div>
		</div>
		<div class="section">
			<MenuItem
				:collapsed
				:item="{
					id: 'Overview',
					label: 'Overview',
					icon: 'house',
				}"
			/>
			<MenuItem
				:collapsed
				:item="{
					id: 'personal',
					label: 'Personal',
					icon: 'user',
				}"
			/>
			<MenuItem
				:collapsed
				:item="{
					id: 'shared',
					label: 'Shared',
					icon: 'share',
				}"
			/>
		</div>
		<div class="section">
			<Tree :items="items">
				<template #default="{ item, handleToggle, isExpanded, hasChildren }">
					<MenuItem :key="item.value.id" :item="item.value" :collapsed>
						<template v-if="hasChildren" #toggle>
							<N8nIconButton
								size="mini"
								type="highlight"
								:icon="isExpanded ? 'chevron-down' : 'chevron-right'"
								icon-size="medium"
								aria-label="Go to details"
								@click="handleToggle"
							/>
						</template>
						<template #actions>
							<N8nIconButton
								size="mini"
								type="highlight"
								icon="ellipsis"
								icon-size="medium"
								aria-label="Go to details"
							/>
							<N8nIconButton
								size="mini"
								type="highlight"
								icon="plus"
								icon-size="medium"
								aria-label="Go to details"
							/>
						</template>
					</MenuItem>
				</template>
			</Tree>
		</div>
	</div>
</template>

<style scoped>
.nav {
	display: flex;
	flex-direction: column;
	gap: 1px;
	width: 250px;
	padding: 4px;
	border-right: 1px solid var(--color--foreground--tint-1);
	overflow: hidden;
	height: 100vh;
}

.header {
	display: flex;
	padding: 2px;
	margin-bottom: 8px;
}

.toggle {
	margin-right: auto;
}

.actions {
	display: flex;
	gap: 4px;
}

.section {
	margin-bottom: 16px;
	border-bottom: 1px solid red;
}
</style>
