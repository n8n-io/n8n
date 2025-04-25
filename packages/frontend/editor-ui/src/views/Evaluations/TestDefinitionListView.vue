<script setup lang="ts">
import EmptyState from '@/components/Evaluations/ListDefinition/EmptyState.vue';
import TestItem from '@/components/Evaluations/ListDefinition/TestItem.vue';
import { useI18n } from '@/composables/useI18n';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useAsyncState } from '@vueuse/core';
import { orderBy } from 'lodash-es';
import {
	N8nActionToggle,
	N8nButton,
	N8nHeading,
	N8nIconButton,
	N8nLoading,
	N8nTooltip,
} from '@n8n/design-system';
import { computed, h } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const props = defineProps<{
	name: string;
}>();

const router = useRouter();
const testDefinitionStore = useTestDefinitionStore();
const toast = useToast();
const locale = useI18n();
const { confirm } = useMessage();

const { isLoading } = useAsyncState(
	async () => {
		await testDefinitionStore.fetchAll({ workflowId: props.name });

		const response = testDefinitionStore.allTestDefinitionsByWorkflowId[props.name] ?? [];
		response.forEach((test) => testDefinitionStore.updateRunFieldIssues(test.id));

		return [];
	},
	[],
	{
		onError: (error) => toast.showError(error, locale.baseText('testDefinition.list.loadError')),
		shallow: false,
	},
);

const tests = computed(() => testDefinitionStore.allTestDefinitionsByWorkflowId[props.name]);

const listItems = computed(() =>
	orderBy(tests.value, [(test) => new Date(test.updatedAt ?? test.createdAt)], ['desc']).map(
		(test) => ({
			...test,
			testCases: (testDefinitionStore.testRunsByTestId[test.id] || []).length,
			lastExecution: testDefinitionStore.lastRunByTestId[test.id] ?? undefined,
			isTestRunning: isTestRunning(test.id),
			setupErrors: testDefinitionStore.getFieldIssues(test.id) ?? [],
		}),
	),
);

const commands = {
	delete: onDeleteTest,
} as const;

type Action = { label: string; value: keyof typeof commands; disabled: boolean };

const actions = computed<Action[]>(() => [
	{
		label: 'Delete',
		value: 'delete',
		disabled: false,
	},
]);

const handleAction = async (action: string, testId: string) =>
	await commands[action as Action['value']](testId);

function isTestRunning(testId: string) {
	return testDefinitionStore.lastRunByTestId[testId]?.status === 'running';
}

function onCreateTest() {
	void router.push({ name: VIEWS.NEW_TEST_DEFINITION });
}

async function onRunTest(testId: string) {
	try {
		const result = await testDefinitionStore.startTestRun(testId);
		if (result.success) {
			toast.showMessage({
				title: locale.baseText('testDefinition.list.testStarted'),
				type: 'success',
				message: h(
					RouterLink,
					{ to: { name: VIEWS.TEST_DEFINITION_EDIT, params: { testId } } },
					() => 'Go to runs',
				),
			});

			// Optionally fetch the updated test runs
			await testDefinitionStore.fetchTestRuns(testId);
		} else {
			throw new Error('Test run failed to start');
		}
	} catch (error) {
		toast.showError(error, locale.baseText('testDefinition.list.testStartError'));
	}
}

async function onCancelTestRun(testId: string) {
	try {
		const testRunId = testDefinitionStore.lastRunByTestId[testId]?.id;
		// FIXME: testRunId might be null for a short period of time between user clicking start and the test run being created and fetched. Just ignore it for now.
		if (!testRunId) {
			throw new Error('Failed to cancel test run');
		}

		const result = await testDefinitionStore.cancelTestRun(testId, testRunId);
		if (result.success) {
			toast.showMessage({
				title: locale.baseText('testDefinition.list.testCancelled'),
				type: 'success',
			});

			// Optionally fetch the updated test runs
			await testDefinitionStore.fetchTestRuns(testId);
		} else {
			throw new Error('Failed to cancel test run');
		}
	} catch (error) {
		toast.showError(error, locale.baseText('testDefinition.list.testStartError'));
	}
}

function onEditTest(testId: string) {
	void router.push({ name: VIEWS.TEST_DEFINITION_EDIT, params: { testId } });
}

async function onDeleteTest(testId: string) {
	const deleteConfirmed = await confirm(
		locale.baseText('testDefinition.deleteTest.warning'),
		locale.baseText('testDefinition.deleteTest'),
		{
			type: 'warning',
			confirmButtonText: locale.baseText('generic.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
			closeOnClickModal: true,
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}
	await testDefinitionStore.deleteById(testId);

	toast.showMessage({
		title: locale.baseText('testDefinition.list.testDeleted'),
		type: 'success',
	});
}
</script>

<template>
	<div :class="$style.container">
		<N8nLoading v-if="isLoading" loading :rows="3" data-test-id="test-definition-loader" />
		<EmptyState
			v-else-if="!listItems.length"
			data-test-id="test-definition-empty-state"
			@create-test="onCreateTest"
		/>
		<template v-else>
			<div :class="$style.header">
				<N8nHeading size="xlarge" color="text-dark" bold>
					{{ locale.baseText('testDefinition.list.tests') }}
				</N8nHeading>
				<div>
					<N8nButton
						:label="locale.baseText('testDefinition.list.createNew')"
						class="mr-xs"
						@click="onCreateTest"
					/>
					<N8nButton
						:label="locale.baseText('testDefinition.list.runAll')"
						disabled
						type="secondary"
					/>
				</div>
			</div>
			<div :class="$style.testList" data-test-id="test-definition-list">
				<TestItem
					v-for="item in listItems"
					:key="item.id"
					:name="item.name"
					:test-cases="item.testCases"
					:execution="item.lastExecution"
					:errors="item.setupErrors"
					:data-test-id="`test-item-${item.id}`"
					@click="onEditTest(item.id)"
				>
					<template #prepend>
						<div @click.stop>
							<N8nTooltip v-if="item.isTestRunning" content="Cancel test run" placement="top">
								<N8nIconButton
									icon="stop"
									type="secondary"
									size="mini"
									@click="onCancelTestRun(item.id)"
								/>
							</N8nTooltip>
							<N8nTooltip
								v-else
								:disabled="!Boolean(item.setupErrors.length)"
								placement="top"
								teleported
							>
								<template #content>
									<div>{{ locale.baseText('testDefinition.completeConfig') }}</div>
									<div v-for="issue in item.setupErrors" :key="issue.field">
										- {{ issue.message }}
									</div>
								</template>
								<N8nIconButton
									icon="play"
									type="secondary"
									size="mini"
									:disabled="Boolean(item.setupErrors.length)"
									:data-test-id="`run-test-${item.id}`"
									@click="onRunTest(item.id)"
								/>
							</N8nTooltip>
						</div>
					</template>
					<template #append>
						<div @click.stop>
							<N8nActionToggle
								:actions="actions"
								:data-test-id="`test-actions-${item.id}`"
								icon-orientation="horizontal"
								@action="(action) => handleAction(action, item.id)"
							>
							</N8nActionToggle>
						</div>
					</template>
				</TestItem>
			</div>
		</template>
	</div>
</template>
<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: 1184px;
	margin: auto;
	padding: var(--spacing-xl) var(--spacing-l);
}
.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.testList {
	display: flex;
	flex-direction: column;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	// gap: 8px;
}

.header {
	display: flex;
	justify-content: space-between;
	margin-bottom: 20px;
}
</style>
