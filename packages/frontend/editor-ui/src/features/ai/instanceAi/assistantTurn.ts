import type { ArtifactTurn } from './artifactTurns';
import { turnHasArtifact } from './useResourceRegistry';

/** The telemetry properties that describe the current turn of a thread. */
export interface AssistantTurnTelemetry {
	/** The user messages in the thread so far. The first message starts turn 1. */
	turn_number: number;
	/** The agent produced an artifact in the current turn so far. */
	turn_has_artifact: boolean;
}

/**
 * The current turn is the latest user message and the agent work after it.
 * Both runtimes map their thread to `ArtifactTurn`, so this reads either.
 */
export function getCurrentTurn(turns: readonly ArtifactTurn[]): AssistantTurnTelemetry {
	const lastUserIndex = turns.findLastIndex((turn) => turn.role === 'user');
	return {
		turn_number: turns.filter((turn) => turn.role === 'user').length,
		turn_has_artifact: turns.slice(lastUserIndex + 1).some(turnHasArtifact),
	};
}
