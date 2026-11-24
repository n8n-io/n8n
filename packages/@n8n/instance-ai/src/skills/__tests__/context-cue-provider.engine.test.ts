import { type AgentMessage, type ContextCueSet, createContextCueProvider } from '@n8n/agents';

import { createInstanceAiContextCueProvider, getInstanceAiContextCueSets } from '../context-cues';
import { getPostBuildFlowCues, POST_BUILD_FLOW_CUES } from '../context-cues/post-build-flow.cues';
import {
	getWorkflowBuilderCues,
	WORKFLOW_BUILDER_CUES,
} from '../context-cues/workflow-builder.cues';
import { DOMAIN_TOOL_IDS } from '../../tools/tool-ids';

vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	createContextCueProvider: vi.fn(() => vi.fn()),
}));

const engineSetup = { engineV2Available: true, newWorkflowEngine: 'v2' } as const;

function errorWorkflowCue(sets: readonly ContextCueSet[]) {
	return sets
		.find((set) => set.id === POST_BUILD_FLOW_CUES.id)
		?.cues.find((cue) => cue.id === 'error-workflow-opt-in');
}

function buildCall(output: Record<string, unknown>): AgentMessage {
	return {
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: `call-${Math.random()}`,
				toolName: DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
				input: {},
				state: 'resolved',
				output: { success: true, filePath: 'workflow.ts', ...output },
			},
		],
	} as AgentMessage;
}

function detectPhases(messages: AgentMessage[]): ReadonlySet<string> {
	vi.mocked(createContextCueProvider).mockClear();
	createInstanceAiContextCueProvider(engineSetup);
	const { detectPhases: detect } = vi.mocked(createContextCueProvider).mock.calls[0][0];
	if (!detect) throw new Error('The provider has no phase detection');
	return detect(messages);
}

describe('createInstanceAiContextCueProvider — workflow engine', () => {
	beforeEach(() => vi.mocked(createContextCueProvider).mockClear());

	it('gives the provider the v1 cues without the engine-v2 module', () => {
		createInstanceAiContextCueProvider();

		const { sets } = vi.mocked(createContextCueProvider).mock.calls[0][0];
		expect(sets).toEqual(getInstanceAiContextCueSets());
		expect(sets[0]).toBe(WORKFLOW_BUILDER_CUES);
		expect(sets[2]).toBe(POST_BUILD_FLOW_CUES);
		expect(errorWorkflowCue(sets)?.phase).toBeUndefined();
	});

	it('gives the provider the engine-aware cues with the engine-v2 module', () => {
		createInstanceAiContextCueProvider(engineSetup);

		const { sets } = vi.mocked(createContextCueProvider).mock.calls[0][0];
		expect(sets[0]).toBe(getWorkflowBuilderCues(engineSetup));
		expect(sets[0].cues.find((cue) => cue.id === 'execute-once')?.text).toContain('On engine v2:');
		expect(sets[2]).toBe(getPostBuildFlowCues(engineSetup));
	});

	it.each(['v1', 'v2'] as const)(
		'offers an error workflow only after a v1 build with the module and %s as the default',
		(newWorkflowEngine) => {
			const sets = getInstanceAiContextCueSets({ engineV2Available: true, newWorkflowEngine });
			const cue = errorWorkflowCue(sets);

			expect(cue?.phase).toBe('v1-build');
			expect(cue?.text).toBe(errorWorkflowCue([POST_BUILD_FLOW_CUES])?.text);
		},
	);

	it('keeps the error workflow offer for every build when engine v2 supports error workflows', async () => {
		vi.resetModules();
		vi.doMock('@n8n/workflow-sdk/prompts/sdk-reference', async (importOriginal) => ({
			...(await importOriginal<typeof import('@n8n/workflow-sdk/prompts/sdk-reference')>()),
			getBlockedEngineV2Limits: () => new Set(['community-nodes']),
		}));
		const fresh = await import('../context-cues/post-build-flow.cues.js');

		expect(fresh.getPostBuildFlowCues(engineSetup)).toBe(fresh.POST_BUILD_FLOW_CUES);
		vi.doUnmock('@n8n/workflow-sdk/prompts/sdk-reference');
	});

	describe('v1-build phase', () => {
		it('is reached when the latest primary build runs on engine v1', () => {
			expect(
				detectPhases([buildCall({ targetEngine: { engine: 'v1', source: 'instance-default' } })]),
			).toContain('v1-build');
		});

		it('is reached by a build result that names no engine', () => {
			expect(detectPhases([buildCall({})])).toContain('v1-build');
		});

		it('is not reached when the latest primary build runs on engine v2', () => {
			const phases = detectPhases([
				buildCall({ targetEngine: { engine: 'v1', source: 'workflow-settings' } }),
				buildCall({ targetEngine: { engine: 'v2', source: 'instance-default' } }),
			]);

			expect(phases).toContain('after-build');
			expect(phases).not.toContain('v1-build');
		});

		it('ignores a supporting workflow build', () => {
			const phases = detectPhases([
				buildCall({ targetEngine: { engine: 'v2', source: 'instance-default' } }),
				buildCall({
					targetEngine: { engine: 'v1', source: 'workflow-settings' },
					isSupportingWorkflow: true,
				}),
			]);

			expect(phases).not.toContain('v1-build');
		});

		it('is not reached without a build', () => {
			expect(detectPhases([])).not.toContain('v1-build');
		});
	});
});
