import { type Component, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useEvaluationStore } from '@/features/evaluation.ee/evaluation.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useToast } from '@/composables/useToast';
import { getResourcePermissions } from '@n8n/permissions';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import type { CommandGroup, CommandBarItem } from './types';

const ITEM_ID = {
	RUN_TEST: 'run-test',
	STOP_TEST: 'stop-test',
	ADD_TRIGGER: 'add-evaluation-trigger',
	ADD_OUTPUTS: 'add-evaluation-outputs',
	ADD_METRICS: 'add-evaluation-metrics',
	EXECUTE_IN_EDITOR: 'execute-in-editor',
} as const;

export function useEvaluationCommands(): CommandGroup {
	const i18n = useI18n();
	const route = useRoute();
	const router = useRouter();
	const evaluationStore = useEvaluationStore();
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();

	const workflowId = computed(() => route.params.name as string);

	const workflowPermissions = computed(
		() => getResourcePermissions(workflowsStore.getWorkflowById(workflowId.value)?.scopes).workflow,
	);

	const runs = computed(() => {
		return Object.values(evaluationStore.testRunsById ?? {}).filter(
			({ workflowId: runWorkflowId }) => runWorkflowId === workflowId.value,
		);
	});

	const hasRuns = computed(() => runs.value.length > 0);

	const showWizard = computed(() => !hasRuns.value);

	const runningTestRun = computed(() => runs.value.find((run) => run.status === 'running'));

	async function handleRunTest() {
		try {
			await evaluationStore.startTestRun(workflowId.value);
		} catch (error) {
			toast.showError(error, i18n.baseText('evaluation.listRuns.error.cantStartTestRun'));
			return;
		}

		try {
			await evaluationStore.fetchTestRuns(workflowId.value);
		} catch (error) {
			toast.showError(error, i18n.baseText('evaluation.listRuns.error.cantFetchTestRuns'));
		}
	}

	async function handleStopTest() {
		if (!runningTestRun.value) {
			return;
		}

		try {
			await evaluationStore.cancelTestRun(runningTestRun.value.workflowId, runningTestRun.value.id);
		} catch (error) {
			toast.showError(error, i18n.baseText('evaluation.listRuns.error.cantStopTestRun'));
		}
	}

	function navigateToWorkflow(
		action?: 'addEvaluationTrigger' | 'addEvaluationNode' | 'executeEvaluation',
	) {
		const routeWorkflowId =
			workflowsStore.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
				? 'new'
				: workflowsStore.workflow.id;

		void router.push({
			name: VIEWS.WORKFLOW,
			params: { name: routeWorkflowId },
			query: action ? { action } : undefined,
		});
	}

	const evaluationCommands = computed<CommandBarItem[]>(() => {
		const commands: CommandBarItem[] = [];

		if (!workflowPermissions.value.execute && !workflowPermissions.value.update) {
			return commands;
		}

		if (showWizard.value) {
			if (!evaluationStore.evaluationTriggerExists) {
				commands.push({
					id: ITEM_ID.ADD_TRIGGER,
					title: i18n.baseText('evaluations.setupWizard.step1.button'),
					section: i18n.baseText('commandBar.sections.evaluation'),
					handler: () => navigateToWorkflow('addEvaluationTrigger'),
					icon: {
						component: N8nIcon as Component,
						props: {
							icon: 'plus',
						},
					},
				});
			}

			if (
				evaluationStore.evaluationTriggerExists &&
				!evaluationStore.evaluationSetOutputsNodeExist
			) {
				commands.push({
					id: ITEM_ID.ADD_OUTPUTS,
					title: i18n.baseText('evaluations.setupWizard.step2.button'),
					section: i18n.baseText('commandBar.sections.evaluation'),
					handler: () => navigateToWorkflow('addEvaluationNode'),
					icon: {
						component: N8nIcon as Component,
						props: {
							icon: 'plus',
						},
					},
				});
			}

			if (
				evaluationStore.evaluationTriggerExists &&
				evaluationStore.evaluationSetOutputsNodeExist &&
				!evaluationStore.evaluationSetMetricsNodeExist
			) {
				commands.push({
					id: ITEM_ID.ADD_METRICS,
					title: i18n.baseText('evaluations.setupWizard.step3.button'),
					section: i18n.baseText('commandBar.sections.evaluation'),
					handler: () => navigateToWorkflow('addEvaluationNode'),
					icon: {
						component: N8nIcon as Component,
						props: {
							icon: 'plus',
						},
					},
				});
			}

			const canRunTest =
				evaluationStore.evaluationTriggerExists &&
				(evaluationStore.evaluationSetOutputsNodeExist ||
					evaluationStore.evaluationSetMetricsNodeExist);

			if (canRunTest) {
				if (evaluationStore.evaluationSetMetricsNodeExist) {
					commands.push({
						id: ITEM_ID.RUN_TEST,
						title: i18n.baseText('evaluations.setupWizard.step4.button'),
						section: i18n.baseText('commandBar.sections.evaluation'),
						handler: handleRunTest,
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'play',
							},
						},
					});
				} else {
					commands.push({
						id: ITEM_ID.EXECUTE_IN_EDITOR,
						title: i18n.baseText('evaluations.setupWizard.step4.altButton'),
						section: i18n.baseText('commandBar.sections.evaluation'),
						handler: () => navigateToWorkflow('executeEvaluation'),
						icon: {
							component: N8nIcon as Component,
							props: {
								icon: 'play',
							},
						},
					});
				}
			}
		} else {
			if (runningTestRun.value) {
				commands.push({
					id: ITEM_ID.STOP_TEST,
					title: i18n.baseText('evaluation.stopTest'),
					section: i18n.baseText('commandBar.sections.evaluation'),
					handler: handleStopTest,
					icon: {
						component: N8nIcon as Component,
						props: {
							icon: 'stop',
						},
					},
				});
			} else {
				commands.push({
					id: ITEM_ID.RUN_TEST,
					title: i18n.baseText('evaluation.runTest'),
					section: i18n.baseText('commandBar.sections.evaluation'),
					handler: handleRunTest,
					icon: {
						component: N8nIcon as Component,
						props: {
							icon: 'play',
						},
					},
				});
			}
		}

		return commands;
	});

	return {
		commands: evaluationCommands,
	};
}
