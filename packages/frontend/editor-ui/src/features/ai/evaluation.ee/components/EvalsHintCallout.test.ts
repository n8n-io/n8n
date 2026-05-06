import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { ref, shallowRef } from 'vue';
import { setActivePinia } from 'pinia';
import { useRouter } from 'vue-router';
import EvalsHintCallout from './EvalsHintCallout.vue';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useWorkflowSettingsCache } from '@/app/composables/useWorkflowsCache';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { canManageInstanceAi } from '@/features/ai/instanceAi/instanceAiPermissions';
import { createTestNode } from '@/__tests__/mocks';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: vi.fn(),
	};
});

vi.mock('@/app/composables/useWorkflowsCache', () => ({
	useWorkflowSettingsCache: vi.fn(),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(),
}));

vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(),
}));

vi.mock('@/features/ai/instanceAi/instanceAiPermissions', () => ({
	canManageInstanceAi: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/i18n')>();
	return {
		...actual,
		useI18n: () => ({ baseText: (key: string) => key }),
		i18n: { ...actual.i18n, baseText: (key: string) => key },
	};
});

const WORKFLOW_ID = 'wf-1';

const workflowDocumentStoreRef = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
	null,
);

const renderComponent = createComponentRenderer(EvalsHintCallout, {
	global: {
		provide: {
			[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
		},
	},
});

describe('EvalsHintCallout', () => {
	let router: ReturnType<typeof useRouter>;
	let workflowsCache: ReturnType<typeof useWorkflowSettingsCache>;
	let telemetry: ReturnType<typeof useTelemetry>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;
	let instanceAiStore: ReturnType<typeof useInstanceAiStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
		workflowDocumentStore.setNodes([
			createTestNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 1 }),
		]);
		workflowDocumentStoreRef.value = workflowDocumentStore;

		router = { push: vi.fn().mockResolvedValue(undefined) } as unknown as ReturnType<
			typeof useRouter
		>;
		(useRouter as ReturnType<typeof vi.fn>).mockReturnValue(router);

		workflowsCache = {
			isCacheLoading: ref(false),
			getMergedWorkflowSettings: vi.fn().mockResolvedValue({ suggestedActions: {} }),
			ignoreSuggestedAction: vi.fn().mockResolvedValue(undefined),
		} as unknown as ReturnType<typeof useWorkflowSettingsCache>;
		(useWorkflowSettingsCache as ReturnType<typeof vi.fn>).mockReturnValue(workflowsCache);

		telemetry = { track: vi.fn() } as unknown as ReturnType<typeof useTelemetry>;
		(useTelemetry as ReturnType<typeof vi.fn>).mockReturnValue(telemetry);

		settingsStore = useSettingsStore(pinia);
		vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
		Object.defineProperty(settingsStore, 'moduleSettings', {
			value: { 'instance-ai': { enabled: true } },
			configurable: true,
		});

		sourceControlStore = useSourceControlStore(pinia);
		Object.defineProperty(sourceControlStore, 'preferences', {
			value: { branchReadOnly: false },
			configurable: true,
		});

		instanceAiStore = {
			newThread: vi.fn().mockReturnValue('new-thread-id'),
			sendMessage: vi.fn().mockResolvedValue(undefined),
			threads: [{ id: 'new-thread-id' }],
		} as unknown as ReturnType<typeof useInstanceAiStore>;
		(useInstanceAiStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(instanceAiStore);

		(canManageInstanceAi as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders when workflow has an AI node and is eligible', async () => {
		const { findByTestId } = renderComponent();
		expect(await findByTestId('evals-hint-callout')).toBeInTheDocument();
	});

	it('does not render when there are no AI nodes', async () => {
		workflowDocumentStoreRef.value?.setNodes([
			createTestNode({ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' }),
		]);
		const { queryByTestId } = renderComponent();
		// Wait for onMounted promise to settle.
		await Promise.resolve();
		expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
	});

	it('does not render when workflow has an EvaluationTrigger', async () => {
		workflowDocumentStoreRef.value?.setNodes([
			createTestNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			createTestNode({ name: 'EvalTrigger', type: 'n8n-nodes-base.evaluationTrigger' }),
		]);
		const { queryByTestId } = renderComponent();
		await Promise.resolve();
		expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
	});

	it('does not render when previously dismissed', async () => {
		(workflowsCache.getMergedWorkflowSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
			suggestedActions: { 'evals-hint': { ignored: true } },
		});
		const { queryByTestId } = renderComponent();
		await vi.waitFor(() => {
			expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
		});
	});

	it('does not render when instance-ai module is inactive', async () => {
		vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(false);
		const { queryByTestId } = renderComponent();
		await Promise.resolve();
		expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
	});

	it('does not render when user lacks instance-ai permission', async () => {
		(canManageInstanceAi as ReturnType<typeof vi.fn>).mockReturnValue(false);
		const { queryByTestId } = renderComponent();
		await Promise.resolve();
		expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
	});

	it('does not render in a read-only branch', async () => {
		Object.defineProperty(sourceControlStore, 'preferences', {
			value: { branchReadOnly: true },
			configurable: true,
		});
		const { queryByTestId } = renderComponent();
		await Promise.resolve();
		expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
	});

	it('starts a new instance-ai thread, sends the message and navigates on CTA click', async () => {
		const { findByTestId } = renderComponent();
		const cta = await findByTestId('evals-hint-cta');
		cta.click();
		await vi.waitFor(() => {
			expect(instanceAiStore.newThread).toHaveBeenCalled();
		});
		expect(instanceAiStore.sendMessage).toHaveBeenCalledWith(
			`Set up evals for workflow ${WORKFLOW_ID}`,
		);
		await vi.waitFor(() => {
			expect(router.push).toHaveBeenCalledWith({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId: 'new-thread-id' },
			});
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			'evals_hint_cta_clicked',
			expect.objectContaining({ workflowId: WORKFLOW_ID }),
		);
	});

	it('does not navigate when thread persistence failed', async () => {
		(instanceAiStore as unknown as { threads: Array<{ id: string }> }).threads = [];
		const { findByTestId } = renderComponent();
		const cta = await findByTestId('evals-hint-cta');
		cta.click();
		await vi.waitFor(() => {
			expect(instanceAiStore.sendMessage).toHaveBeenCalled();
		});
		expect(router.push).not.toHaveBeenCalled();
	});

	it('persists dismissal on X click and hides the callout', async () => {
		const { findByTestId, queryByTestId } = renderComponent();
		const dismiss = await findByTestId('evals-hint-dismiss');
		dismiss.click();
		await vi.waitFor(() => {
			expect(workflowsCache.ignoreSuggestedAction).toHaveBeenCalledWith(WORKFLOW_ID, 'evals-hint');
		});
		await vi.waitFor(() => {
			expect(queryByTestId('evals-hint-callout')).not.toBeInTheDocument();
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			'evals_hint_dismissed',
			expect.objectContaining({ workflowId: WORKFLOW_ID }),
		);
	});
});
