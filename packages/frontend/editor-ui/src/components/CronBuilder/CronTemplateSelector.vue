<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nButton, N8nText, N8nIcon } from '@n8n/design-system';
import { getTemplatesByCategory } from './utils/cronTemplates';
import type { CronTemplate } from './types';

interface Props {
	selectedTemplate?: string;
}

interface Emits {
	(e: 'template-selected', templateId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const categories: Array<CronTemplate['category']> = ['common', 'business', 'development'];
const selectedCategory = ref<CronTemplate['category']>('common');

const filteredTemplates = computed(() => {
	return getTemplatesByCategory(selectedCategory.value);
});

function getCategoryLabel(category: CronTemplate['category']): string {
	const labels: Record<CronTemplate['category'], string> = {
		common: 'Common',
		business: 'Business Hours',
		development: 'Development',
		custom: 'Custom',
	};
	return labels[category];
}

function handleTemplateClick(templateId: string) {
	emit('template-selected', templateId);
}
</script>

<template>
	<div class="cron-template-selector">
		<div class="cron-template-selector__categories">
			<N8nButton
				v-for="category in categories"
				:key="category"
				:type="selectedCategory === category ? 'primary' : 'secondary'"
				:outline="selectedCategory !== category"
				size="small"
				@click="selectedCategory = category"
			>
				{{ getCategoryLabel(category) }}
			</N8nButton>
		</div>

		<div class="cron-template-selector__templates">
			<div
				v-for="template in filteredTemplates"
				:key="template.id"
				class="cron-template-selector__template"
				:class="{ 'is-selected': selectedTemplate === template.id }"
				@click="handleTemplateClick(template.id)"
			>
				<div class="cron-template-selector__template-header">
					<N8nText bold>{{ template.name }}</N8nText>
					<N8nIcon
						v-if="selectedTemplate === template.id"
						icon="check"
						color="success"
						size="small"
					/>
				</div>
				<N8nText size="small" color="text-light">{{ template.description }}</N8nText>
				<div class="cron-template-selector__template-expression">
					<N8nText size="small" color="text-dark">
						<code>{{ template.expression }}</code>
					</N8nText>
				</div>
			</div>
		</div>

		<div v-if="filteredTemplates.length === 0" class="cron-template-selector__empty">
			<N8nText color="text-light">No templates found in this category</N8nText>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.cron-template-selector {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--s);

	&__categories {
		display: flex;
		gap: var(--spacing--2xs);
		justify-content: center;
	}

	&__templates {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--spacing--xs);
		max-height: 400px;
		overflow-y: auto;
		padding: var(--spacing--2xs);
	}

	&__template {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);
		padding: var(--spacing--xs);
		background: var(--color--background-base);
		border: 2px solid var(--color--foreground-base);
		border-radius: var(--radius);
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			border-color: var(--color--primary);
			background: var(--color--background-light);
		}

		&.is-selected {
			border-color: var(--color--success);
			background: var(--color--success-tint-2);
		}
	}

	&__template-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	&__template-expression {
		padding: var(--spacing--2xs);
		background: var(--color--background-dark);
		border-radius: var(--radius--sm);
		font-family: var(--font-family--monospace);

		code {
			font-size: var(--font-size--2xs);
			color: var(--color--text-dark);
		}
	}

	&__empty {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: var(--spacing--l);
		background: var(--color--background-light);
		border: 1px dashed var(--color--foreground-base);
		border-radius: var(--radius);
	}
}
</style>
