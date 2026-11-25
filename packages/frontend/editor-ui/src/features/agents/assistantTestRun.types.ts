import type { WouldHaveHappenedPreviewInput } from './components/testRun/wouldHaveHappened.types';
import type { AgentToolCallRouteItem } from './toolCallSimulation.types';

/**
 * One tool call on the assistant's test run card: how it ran, and for a simulated
 * call, what would have happened. `toolName` and `preview.toolName` are both the Agent
 * tool name the model called, set from the same field by the backend.
 */
export type AgentAssistantTestRunCall = AgentToolCallRouteItem & {
	/** Shown only when the call's route is `simulated` or `simulated_made_up`. */
	preview?: WouldHaveHappenedPreviewInput | null;
};
