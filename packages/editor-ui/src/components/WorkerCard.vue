<template>
	<n8n-card :class="$style.cardLink" @click="onClick" v-show="worker">
		<template #header>
			<n8n-heading tag="h2" bold :class="$style.cardHeading" data-test-id="workflow-card-name">
				{{ worker?.workerId }}
			</n8n-heading>
		</template>
		<div :class="$style.cardDescription">
			<n8n-text color="text-light" size="small">
				<span v-show="worker"
					>{{ $locale.baseText('workerList.item.lastUpdated') }} {{ secondsSinceLastUpdate }}s ago |
				</span>
				<n8n-info-accordion
					:class="[$style.accordion]"
					:title="'Jobs (' + jobCount + ')'"
					:items="jobs"
					:initiallyExpanded="false"
					:headerIcon="{ icon: 'tasks', color: 'black' }"
					@click:body="onAccordionClick"
				></n8n-info-accordion>
				<div
					v-for="job in worker?.runningJobsSummary"
					:key="job.executionId"
					:class="$style.executionlink"
				>
					<a :href="'/workflow/' + job.workflowId + '/executions/' + job.executionId"
						>{{ job.workflowName }} ({{ job.executionId }})</a
					>
				</div>
			</n8n-text>
		</div>
		<template #append>
			<div :class="$style.cardActions" ref="cardActions">
				<!-- <n8n-action-toggle
					:actions="actions"
					theme="dark"
					@action="onAction"
					@click.stop
					data-test-id="workflow-card-actions"
				/> -->
			</div>
		</template>
	</n8n-card>
</template>

<script setup lang="ts">
import { useOrchestrationStore } from '../stores/orchestration.store';
import type { IPushDataWorkerStatusPayload } from '../Interface';
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

let interval: NodeJS.Timer;

const orchestrationStore = useOrchestrationStore();

const props = defineProps<{
	workerId: string;
}>();

const secondsSinceLastUpdate = ref<string>('0');

// const lastUpdated = computed((): number => {
// 	const workerLastUpdated = orchestrationStore.getWorkerLastUpdated(props.workerId);
// 	return workerLastUpdated ?? 0;
// });
// const secondsSinceLastUpdate = computed((): string => {
// 	return Math.floor((Date.now() - lastUpdated.value) / 1000).toFixed(1);
// });
const worker = computed((): IPushDataWorkerStatusPayload | undefined => {
	return orchestrationStore.getWorkerStatus(props.workerId);
});

const jobCount = computed((): number => {
	return worker.value?.runningJobsSummary?.length ?? 0;
});

const jobs = computed((): Object[] => {
	if (!worker.value?.runningJobsSummary) {
		return [];
	}
	return worker.value?.runningJobsSummary.map((job) => {
		// const executionLink = `<a :href="'/workflow/' + job.workflowId + '/executions/' + job.executionId"
		// 								>{{ job.workflowName }} ({{ job.executionId }})</a
		// 							>`;
		return {
			id: job.executionId,
			label: 'label',
			icon: 'times',
			iconColor: 'success',
		};
	});

	return worker.value?.runningJobsSummary ?? [];
});

onMounted(() => {
	interval = setInterval(() => {
		const lastUpdated = orchestrationStore.getWorkerLastUpdated(props.workerId);
		if (!lastUpdated) {
			return;
		}
		secondsSinceLastUpdate.value = Math.ceil((Date.now() - lastUpdated) / 1000).toFixed(0);
	}, 500);
});

onBeforeUnmount(() => {
	clearInterval(interval);
});

function onAccordionClick(event: MouseEvent): void {
	if (event.target instanceof HTMLAnchorElement) {
		event.preventDefault();
		// this.uiStore.openModal(WORKFLOW_SETTINGS_MODAL_KEY);
	}
}
// computed: {
// 	...mapStores(useOrchestrationStore),
// },
// 	methods: {
// 		async onClick(event: Event) {
// 			if (this.$refs.cardActions === event.target) {
// 				return;
// 			}

// 			// if (event.metaKey || event.ctrlKey) {
// 			// 	const route = this.$router.resolve({
// 			// 		name: VIEWS.WORKFLOW,
// 			// 		params: { name: this.data.id },
// 			// 	});
// 			// 	window.open(route.href, '_blank');

// 			return;
// 		},
// 	},
// 	// onClickTag(tagId: string, event: PointerEvent) {
// 	// 	event.stopPropagation();

// 	// 	this.$emit('click:tag', tagId, event);
// 	// },
// 	// },
// });
async function onClick(event: Event) {
	return;
}
</script>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0;
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: break-word;
	padding: var(--spacing-s) 0 0 var(--spacing-s);
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s) var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}

.accordion {
	background: none;
	width: 100%;

	// Accordion header
	& > div:nth-child(1) {
		display: flex;
		flex-direction: row;
		padding: var(--spacing-xs);
		width: 100%;
		user-select: none;
		color: var(--color-text-base) !important;
	}

	// Accordion description
	& > div:nth-child(2) {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 0 var(--spacing-l) var(--spacing-s) !important;

		span {
			width: 100%;
		}
	}

	footer {
		text-align: left;
		width: 100%;
		font-size: var(--font-size-2xs);
	}

	.disabled a {
		color: currentColor;
		cursor: not-allowed;
		opacity: 0.5;
		text-decoration: none;
	}
}
</style>
