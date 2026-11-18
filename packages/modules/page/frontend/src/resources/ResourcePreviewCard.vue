<script setup lang="ts">
import type { PageResourceType } from '@n8n/api-types';
import { N8nIcon, N8nTimeAgo } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import ResourceIcon from './ResourceIcon.vue';
import { toResourceDisplay } from './resourceDisplay';
import type { ResourceDetails } from './resourceNameResolver';

/** Shows what is known about a resource, and a link that opens it. */
const props = defineProps<{
	resourceType: PageResourceType;
	details: ResourceDetails;
	/** The address that the link opens, with the base path of the instance. */
	address: string;
}>();

const emit = defineEmits<{
	open: [event: MouseEvent];
}>();

const TYPE_LABELS: Record<PageResourceType, BaseTextKey> = {
	workflow: 'page.resource.type.workflow',
	node: 'page.resource.type.node',
	page: 'page.resource.type.page',
	credential: 'page.resource.type.credential',
	dataTable: 'page.resource.type.dataTable',
};

const i18n = useI18n();

const display = computed(() =>
	toResourceDisplay(props.resourceType, props.details.nodeName ?? props.details.name),
);

const activityLabel = computed(() =>
	i18n.baseText(
		props.details.isActive ? 'page.resource.preview.active' : 'page.resource.preview.inactive',
	),
);
</script>

<template>
	<div :class="$style.card" data-test-id="page-resource-preview">
		<div :class="$style.type">
			<ResourceIcon
				:icon="display.icon"
				:emoji="display.emoji"
				:node-type="details.nodeType"
				size="xsmall"
			/>
			<span>{{ i18n.baseText(TYPE_LABELS[resourceType]) }}</span>
		</div>
		<div :class="$style.name">{{ display.text }}</div>
		<div v-if="details.workflowName" :class="$style.context">
			{{
				i18n.baseText('page.resource.preview.inWorkflow', {
					interpolate: { workflow: details.workflowName },
				})
			}}
		</div>
		<div :class="$style.facts">
			<span
				v-if="details.isActive !== undefined"
				:class="[$style.activity, details.isActive ? $style.active : '']"
				data-test-id="page-resource-preview-activity"
			>
				<span :class="$style.dot" aria-hidden="true" />
				{{ activityLabel }}
			</span>
			<span v-if="details.updatedAt" data-test-id="page-resource-preview-updated">
				{{ i18n.baseText('page.resource.preview.updated') }}
				<N8nTimeAgo :date="details.updatedAt" />
			</span>
		</div>
		<a
			:href="address"
			:class="$style.open"
			data-test-id="page-resource-preview-open"
			@click="emit('open', $event)"
		>
			{{ i18n.baseText('page.resource.preview.open') }}
			<N8nIcon icon="arrow-right" size="xsmall" />
		</a>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: max-content;
	min-width: calc(var(--spacing--4xl) + var(--spacing--2xl));
	max-width: calc(var(--spacing--5xl) + var(--spacing--2xl));
	padding: var(--spacing--xs) var(--spacing--sm);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.type {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.name {
	display: -webkit-box;
	overflow: hidden;
	font-weight: var(--font-weight--bold);
	overflow-wrap: anywhere;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.context,
.facts {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}

.facts {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--5xs) var(--spacing--xs);

	&:empty {
		display: none;
	}
}

.activity {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.dot {
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
	background-color: var(--text-color--subtler);
}

.active .dot {
	background-color: var(--color--success);
}

.open {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--3xs);
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}
</style>
