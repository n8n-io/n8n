<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nInput } from '@n8n/design-system';
import {
	BUSINESS_AGENT_TEMPLATES,
	TEMPLATE_CATEGORIES,
	type BusinessAgentTemplate,
} from '@/features/ai/chatHub/business-templates';

const emit = defineEmits<{
	select: [template: BusinessAgentTemplate];
	skip: [];
}>();

const searchQuery = ref('');
const selectedCategory = ref<string>('all');

const filteredTemplates = computed(() => {
	return BUSINESS_AGENT_TEMPLATES.filter((template) => {
		const matchesCategory =
			selectedCategory.value === 'all' || template.category === selectedCategory.value;
		const matchesSearch =
			searchQuery.value.trim() === '' ||
			template.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
			template.description.toLowerCase().includes(searchQuery.value.toLowerCase());
		return matchesCategory && matchesSearch;
	});
});

function onSelectTemplate(template: BusinessAgentTemplate) {
	emit('select', template);
}

function onSkip() {
	emit('skip');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nText tag="h3" size="large" bold>Start from a template</N8nText>
			<N8nText color="text-light" size="small">
				Choose a pre-configured business agent template or start from scratch.
			</N8nText>
		</div>

		<div :class="$style.filters">
			<N8nInput
				v-model="searchQuery"
				placeholder="Search templates..."
				:class="$style.search"
				clearable
				size="small"
			>
				<template #prefix>
					<N8nIcon icon="search" size="xsmall" />
				</template>
			</N8nInput>

			<div :class="$style.categories">
				<button
					v-for="category in TEMPLATE_CATEGORIES"
					:key="category.id"
					:class="[$style.categoryBtn, { [$style.active]: selectedCategory === category.id }]"
					@click="selectedCategory = category.id"
				>
					{{ category.label }}
				</button>
			</div>
		</div>

		<div :class="$style.grid">
			<button
				v-for="template in filteredTemplates"
				:key="template.id"
				:class="$style.templateCard"
				data-test-id="agent-template-card"
				@click="onSelectTemplate(template)"
			>
				<div :class="$style.cardHeader">
					<div :class="[$style.iconWrapper, $style[template.category]]">
						<N8nIcon :icon="template.icon" size="medium" />
					</div>
					<div :class="$style.cardCategory">
						{{ template.category }}
					</div>
				</div>

				<N8nText tag="p" bold size="medium" :class="$style.cardTitle">
					{{ template.name }}
				</N8nText>

				<N8nText color="text-light" size="small" :class="$style.cardDescription">
					{{ template.description }}
				</N8nText>

				<div v-if="template.integrations.length > 0" :class="$style.integrations">
					<N8nText size="xsmall" color="text-light">Works with:</N8nText>
					<div :class="$style.integrationTags">
						<span
							v-for="integration in template.integrations.slice(0, 3)"
							:key="integration"
							:class="$style.tag"
						>
							{{ integration }}
						</span>
						<span v-if="template.integrations.length > 3" :class="$style.tag">
							+{{ template.integrations.length - 3 }}
						</span>
					</div>
				</div>
			</button>

			<div v-if="filteredTemplates.length === 0" :class="$style.empty">
				<N8nText color="text-light">No templates match your search.</N8nText>
			</div>
		</div>

		<div :class="$style.footer">
			<N8nButton type="tertiary" size="small" @click="onSkip">
				Start from scratch
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.filters {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.search {
	width: 100%;
}

.categories {
	display: flex;
	gap: var(--spacing--4xs);
	flex-wrap: wrap;
}

.categoryBtn {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	transition: all 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
		color: var(--color--primary);
	}

	&.active {
		background: var(--color--primary--tint-3);
		border-color: var(--color--primary);
		color: var(--color--primary);
		font-weight: var(--font-weight--bold);
	}
}

.grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing--2xs);
	max-height: 380px;
	overflow-y: auto;
}

.templateCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	cursor: pointer;
	text-align: left;
	transition: all 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
		background: var(--color--primary--tint-3);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: var(--radius);

	&.sales {
		background: var(--color--success--tint-4);
		color: var(--color--success--shade-1);
	}

	&.support {
		background: var(--color--primary--tint-3);
		color: var(--color--primary--shade-1);
	}

	&.operations {
		background: var(--color--warning--tint-2);
		color: var(--color--warning--shade-1);
	}

	&.crm {
		background: var(--color--secondary--tint-2);
		color: var(--color--secondary--shade-1);
	}
}

.cardCategory {
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--color--text--tint-2);
	font-weight: var(--font-weight--bold);
}

.cardTitle {
	margin: 0;
}

.cardDescription {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--xl);
}

.integrations {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin-top: auto;
}

.integrationTags {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--5xs);
}

.tag {
	font-size: var(--font-size--3xs);
	padding: 2px var(--spacing--4xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--sm);
	color: var(--color--text--tint-1);
}

.empty {
	grid-column: 1 / -1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}

.footer {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--3xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
}
</style>
