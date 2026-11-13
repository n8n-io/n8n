import { getCurrentTurn } from '../assistantTurn';
import type { ArtifactToolCall, ArtifactTurn } from '../artifactTurns';

const buildCall: ArtifactToolCall = {
	toolCallId: 'tc-build',
	toolName: 'workflow_builder_build_workflow',
	args: {},
	result: { workflowId: 'wf-1', workflowName: 'My workflow' },
	isLoading: false,
};

const unrelatedCall: ArtifactToolCall = {
	toolCallId: 'tc-other',
	toolName: 'some-tool',
	args: {},
	isLoading: false,
};

function userTurn(id: string, overrides: Partial<ArtifactTurn> = {}): ArtifactTurn {
	return { id, role: 'user', isLive: false, toolCalls: [], ...overrides };
}

function assistantTurn(id: string, toolCalls: ArtifactToolCall[] = []): ArtifactTurn {
	return { id, role: 'assistant', isLive: false, toolCalls };
}

describe('getCurrentTurn', () => {
	it('is turn 0 without an artifact before the user sends a message', () => {
		expect(getCurrentTurn([])).toEqual({ turn_number: 0, turn_has_artifact: false });
	});

	it('numbers the turn by the user messages so far, starting at 1', () => {
		const turns = [userTurn('u1'), assistantTurn('a1'), userTurn('u2'), assistantTurn('a2')];

		expect(getCurrentTurn(turns).turn_number).toBe(2);
	});

	it('reports an artifact that the agent produced in the current turn', () => {
		const turns = [userTurn('u1'), assistantTurn('a1', [buildCall])];

		expect(getCurrentTurn(turns)).toEqual({ turn_number: 1, turn_has_artifact: true });
	});

	it('ignores an artifact from an earlier turn', () => {
		const turns = [
			userTurn('u1'),
			assistantTurn('a1', [buildCall]),
			userTurn('u2'),
			assistantTurn('a2', [unrelatedCall]),
		];

		expect(getCurrentTurn(turns)).toEqual({ turn_number: 2, turn_has_artifact: false });
	});

	it('has no artifact while the agent has not started on the current turn', () => {
		const turns = [userTurn('u1'), assistantTurn('a1', [buildCall]), userTurn('u2')];

		expect(getCurrentTurn(turns)).toEqual({ turn_number: 2, turn_has_artifact: false });
	});

	it('does not count a resource that the user attached to the message', () => {
		const turns = [
			userTurn('u1', { attachments: [{ type: 'workflow', id: 'wf-attached', name: 'Attached' }] }),
			assistantTurn('a1'),
		];

		expect(getCurrentTurn(turns).turn_has_artifact).toBe(false);
	});

	it('does not count a tool call that produces no artifact', () => {
		const turns = [userTurn('u1'), assistantTurn('a1', [unrelatedCall])];

		expect(getCurrentTurn(turns).turn_has_artifact).toBe(false);
	});

	it('looks at every assistant message of the current turn', () => {
		const turns = [userTurn('u1'), assistantTurn('a1'), assistantTurn('a2', [buildCall])];

		expect(getCurrentTurn(turns)).toEqual({ turn_number: 1, turn_has_artifact: true });
	});
});
