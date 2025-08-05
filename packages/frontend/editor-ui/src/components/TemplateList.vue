<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import TemplateCard from './TemplateCard.vue';
import type { ITemplatesWorkflow } from '@n8n/rest-api-client/api/templates';
import { useI18n } from '@n8n/i18n';

interface Props {
	workflows?: ITemplatesWorkflow[];
	infiniteScrollEnabled?: boolean;
	loading?: boolean;
	useWorkflowButton?: boolean;
	totalWorkflows?: number;
	simpleView?: boolean;
	totalCount?: number;
}

const emit = defineEmits<{
	loadMore: [];
	openTemplate: [{ event: MouseEvent; id: number }];
	useWorkflow: [{ event: MouseEvent; id: number }];
}>();

const props = withDefaults(defineProps<Props>(), {
	infiniteScrollEnabled: false,
	loading: false,
	useWorkflowButton: false,
	workflows: () => [],
	totalWorkflows: 0,
	simpleView: false,
	totalCount: 0,
});

const i18n = useI18n();

const loader = ref<HTMLElement | null>(null);

onMounted(() => {
	if (props.infiniteScrollEnabled) {
		const content = document.getElementById('content');
		if (content) {
			content.addEventListener('scroll', onScroll);
		}
	}
});

onBeforeUnmount(() => {
	const content = document.getElementById('content');
	if (content) {
		content.removeEventListener('scroll', onScroll);
	}
});

function onScroll() {
	const loaderRef = loader.value as HTMLElement | undefined;
	if (!loaderRef || props.loading) {
		return;
	}

	const rect = loaderRef.getBoundingClientRect();
	const inView =
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth);

	if (inView) {
		emit('loadMore');
	}
}
function onCardClick(event: MouseEvent, id: number) {
	emit('openTemplate', { event, id });
}
function onUseWorkflow(event: MouseEvent, id: number) {
	emit('useWorkflow', { event, id });
}
</script>

<template>
	<div v-if="loading || workflows.length" :class="$style.list">
		<div v-if="!simpleView" :class="$style.header">
			<n8n-heading :bold="true" size="medium" color="text-light">
				{{ i18n.baseText('templates.workflows') }}
				<span v-if="totalCount > 0" data-test-id="template-count-label">({{ totalCount }})</span>
				<span v-if="!loading && totalWorkflows" v-text="`(${totalWorkflows})`" />
			</n8n-heading>
		</div>
		<div :class="$style.container">
			<TemplateCard
				v-for="(workflow, index) in workflows"
				:key="workflow.id"
				:workflow="workflow"
				:first-item="index === 0"
				:simple-view="simpleView"
				:last-item="index === workflows.length - 1 && !loading"
				:use-workflow-button="useWorkflowButton"
				@click="(e) => onCardClick(e, workflow.id)"
				@use-workflow="(e) => onUseWorkflow(e, workflow.id)"
			/>
			<div v-if="infiniteScrollEnabled" ref="loader" />
			<div v-if="loading" data-test-id="templates-loading-container">
				<TemplateCard
					v-for="n in 4"
					:key="'index-' + n"
					:loading="true"
					:first-item="workflows.length === 0 && n === 1"
					:last-item="n === 4"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.header {
	padding-bottom: var(--spacing-2xs);
}

.workflowButton {
	&:hover {
		.button {
			display: block;
		}

		.nodes {
			display: none;
		}
	}
}
</style>
