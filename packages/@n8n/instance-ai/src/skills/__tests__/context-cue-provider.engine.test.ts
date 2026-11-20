import { createContextCueProvider } from '@n8n/agents';

import { createInstanceAiContextCueProvider, getInstanceAiContextCueSets } from '../context-cues';
import {
	getWorkflowBuilderCues,
	WORKFLOW_BUILDER_CUES,
} from '../context-cues/workflow-builder.cues';

vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	createContextCueProvider: vi.fn(() => vi.fn()),
}));

describe('createInstanceAiContextCueProvider — workflow engine', () => {
	beforeEach(() => vi.mocked(createContextCueProvider).mockClear());

	it('gives the provider the v1 cues without the engine-v2 module', () => {
		createInstanceAiContextCueProvider();

		const { sets } = vi.mocked(createContextCueProvider).mock.calls[0][0];
		expect(sets).toEqual(getInstanceAiContextCueSets());
		expect(sets[0]).toBe(WORKFLOW_BUILDER_CUES);
	});

	it('gives the provider the engine-aware cues with the engine-v2 module', () => {
		const engineSetup = { engineV2Available: true, newWorkflowEngine: 'v2' } as const;
		createInstanceAiContextCueProvider(engineSetup);

		const { sets } = vi.mocked(createContextCueProvider).mock.calls[0][0];
		expect(sets[0]).toBe(getWorkflowBuilderCues(engineSetup));
		expect(sets[0].cues.find((cue) => cue.id === 'execute-once')?.text).toContain('On engine v2:');
	});
});
