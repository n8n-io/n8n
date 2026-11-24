import type { CoordinationLogEntry, CoordinationMetadata } from '../../types/coordination';
import {
	getLastCompletedPhase,
	getPhaseEntry,
	hasPhaseCompleted,
	getBuilderOutput,
	getNextPhaseFromLog,
	hasBuilderPhaseInLog,
	hasErrorInLog,
	getErrorEntry,
	summarizeCoordinationLog,
} from '../coordination-log';

describe('coordination-log utilities', () => {
	const createMetadata = (phase: 'discovery' | 'builder' | 'assistant'): CoordinationMetadata => {
		if (phase === 'discovery') {
			return { phase: 'discovery', nodesFound: 3, nodeTypes: ['test'], hasBestPractices: true };
		}
		if (phase === 'assistant') {
			return { phase: 'assistant', hasCodeDiff: false, suggestionCount: 0 };
		}
		return {
			phase: 'builder',
			nodesCreated: 2,
			connectionsCreated: 1,
			nodeNames: ['Node1', 'Node2'],
		};
	};

	const createLogEntry = (
		phase: 'discovery' | 'builder' | 'assistant',
		status: 'completed' | 'error' = 'completed',
		output?: string,
	): CoordinationLogEntry => ({
		phase,
		status,
		summary: `${phase} phase ${status}`,
		output,
		timestamp: Date.now(),
		metadata: createMetadata(phase),
	});

	describe('getLastCompletedPhase', () => {
		it('should return null for empty log', () => {
			expect(getLastCompletedPhase([])).toBeNull();
		});

		it('should return the last completed phase', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder')];
			expect(getLastCompletedPhase(log)).toBe('builder');
		});

		it('should skip non-completed entries', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'error')];
			expect(getLastCompletedPhase(log)).toBe('discovery');
		});
	});

	describe('getPhaseEntry', () => {
		it('should return null when phase not found', () => {
			const log = [createLogEntry('discovery')];
			expect(getPhaseEntry(log, 'builder')).toBeNull();
		});

		it('should return the completed entry for a phase', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'completed', 'output')];
			const entry = getPhaseEntry(log, 'builder');
			expect(entry?.phase).toBe('builder');
			expect(entry?.output).toBe('output');
		});

		it('should not return non-completed entries', () => {
			const log = [createLogEntry('discovery', 'error')];
			expect(getPhaseEntry(log, 'discovery')).toBeNull();
		});
	});

	describe('hasPhaseCompleted', () => {
		it('should return false for empty log', () => {
			expect(hasPhaseCompleted([], 'discovery')).toBe(false);
		});

		it('should return true when phase is completed', () => {
			const log = [createLogEntry('discovery')];
			expect(hasPhaseCompleted(log, 'discovery')).toBe(true);
		});

		it('should return false when phase is not completed', () => {
			const log = [createLogEntry('discovery', 'error')];
			expect(hasPhaseCompleted(log, 'discovery')).toBe(false);
		});
	});

	describe('getBuilderOutput', () => {
		it('should return null when builder not completed', () => {
			const log = [createLogEntry('discovery')];
			expect(getBuilderOutput(log)).toBeNull();
		});

		it('should return builder output', () => {
			const log = [createLogEntry('builder', 'completed', 'workflow summary')];
			expect(getBuilderOutput(log)).toBe('workflow summary');
		});
	});

	describe('hasErrorInLog', () => {
		it('should return false for empty log', () => {
			expect(hasErrorInLog([])).toBe(false);
		});

		it('should return false when all phases completed successfully', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder')];
			expect(hasErrorInLog(log)).toBe(false);
		});

		it('should return true when any phase has error', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'error')];
			expect(hasErrorInLog(log)).toBe(true);
		});

		it('should return true when first phase errors', () => {
			const log = [createLogEntry('discovery', 'error')];
			expect(hasErrorInLog(log)).toBe(true);
		});
	});

	describe('getErrorEntry', () => {
		it('should return null for empty log', () => {
			expect(getErrorEntry([])).toBeNull();
		});

		it('should return null when no errors', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder')];
			expect(getErrorEntry(log)).toBeNull();
		});

		it('should return error entry when present', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'error')];
			const errorEntry = getErrorEntry(log);
			expect(errorEntry?.phase).toBe('builder');
			expect(errorEntry?.status).toBe('error');
		});

		it('should return first error entry when multiple errors', () => {
			const log = [createLogEntry('discovery', 'error'), createLogEntry('builder', 'error')];
			const errorEntry = getErrorEntry(log);
			expect(errorEntry?.phase).toBe('discovery');
		});
	});

	describe('getNextPhaseFromLog', () => {
		it('should return responder for empty log', () => {
			expect(getNextPhaseFromLog([])).toBe('responder');
		});

		it('should return builder after discovery', () => {
			const log = [createLogEntry('discovery')];
			expect(getNextPhaseFromLog(log)).toBe('builder');
		});

		it('should return responder after builder', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder')];
			expect(getNextPhaseFromLog(log)).toBe('responder');
		});

		it('should return responder when discovery errors', () => {
			const log = [createLogEntry('discovery', 'error')];
			expect(getNextPhaseFromLog(log)).toBe('responder');
		});

		it('should return responder when builder errors after successful discovery', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'error')];
			expect(getNextPhaseFromLog(log)).toBe('responder');
		});
	});

	describe('summarizeCoordinationLog', () => {
		it('should return message for empty log', () => {
			expect(summarizeCoordinationLog([])).toBe('No phases completed');
		});

		it('should summarize completed phases', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder')];
			const summary = summarizeCoordinationLog(log);
			expect(summary).toContain('discovery');
			expect(summary).toContain('builder');
			expect(summary).toContain('→');
		});

		it('should skip non-completed phases in summary', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'error')];
			const summary = summarizeCoordinationLog(log);
			expect(summary).toContain('discovery');
			expect(summary).not.toContain('builder');
		});
	});

	describe('getNextPhaseFromLog - assistant routing', () => {
		it('should return responder after assistant completes', () => {
			const log = [createLogEntry('assistant')];
			expect(getNextPhaseFromLog(log)).toBe('responder');
		});

		it('should return responder when assistant errors', () => {
			const log = [createLogEntry('assistant', 'error')];
			expect(getNextPhaseFromLog(log)).toBe('responder');
		});
	});

	describe('hasBuilderPhaseInLog', () => {
		it('should return false for empty log', () => {
			expect(hasBuilderPhaseInLog([])).toBe(false);
		});

		it('should return true when builder completed', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder')];
			expect(hasBuilderPhaseInLog(log)).toBe(true);
		});

		it('should return false when builder errored', () => {
			const log = [createLogEntry('discovery'), createLogEntry('builder', 'error')];
			expect(hasBuilderPhaseInLog(log)).toBe(false);
		});

		it('should return false for assistant-only flows', () => {
			const log = [createLogEntry('assistant')];
			expect(hasBuilderPhaseInLog(log)).toBe(false);
		});

		it('should return false for discovery-only flows', () => {
			const log = [createLogEntry('discovery')];
			expect(hasBuilderPhaseInLog(log)).toBe(false);
		});
	});
});
