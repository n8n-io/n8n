import type { VerificationAnalysis } from '../analyze-result';
import { deriveVerificationClaim } from '../claim';

function makeAnalysis(overrides: Partial<VerificationAnalysis> = {}): VerificationAnalysis {
	return {
		success: true,
		reachedNames: new Set(['Trigger', 'Fetch', 'Send']),
		reachedSimulatedNodes: [],
		workflowPinnedNodeNames: [],
		nodesNotReached: [],
		nodeErrors: [],
		...overrides,
	};
}

describe('deriveVerificationClaim', () => {
	it('claims verified when every planned node ran for real', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis(),
			plannedNodeCount: 3,
		});

		expect(claim.level).toBe('verified');
		expect(claim.publishReady).toBe(true);
		expect(claim.liveTestRecommended).toBe(false);
		expect(claim.reachedNodeCount).toBe(3);
	});

	it('downgrades to partial when planned nodes were never reached', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({ nodesNotReached: ['Send', 'Log'] }),
			plannedNodeCount: 5,
		});

		expect(claim.level).toBe('partial');
		expect(claim.publishReady).toBe(false);
		expect(claim.liveTestRecommended).toBe(true);
		expect(claim.nodesNotReached).toEqual(['Send', 'Log']);
	});

	it('downgrades to partial when a reached node had simulated output', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({
				reachedSimulatedNodes: [{ nodeName: 'Send', reason: 'Sends a message' }],
			}),
			plannedNodeCount: 3,
		});

		expect(claim.level).toBe('partial');
		expect(claim.publishReady).toBe(false);
	});

	it('never claims verified for a pin-fed run', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({
				reachedSimulatedNodes: [{ nodeName: 'Fetch', reason: 'Output came from pinned data' }],
				workflowPinnedNodeNames: ['Fetch'],
			}),
			plannedNodeCount: 3,
		});

		expect(claim.level).toBe('partial');
		expect(claim.pinnedNodes).toEqual(['Fetch']);
	});

	it('reports unproven when the fix target was never reached', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({ nodesNotReached: ['Send'] }),
			plannedNodeCount: 4,
			fixTargetNodeNames: ['Send'],
		});

		expect(claim.level).toBe('unproven');
		expect(claim.unprovenTargets).toEqual(['Send']);
		expect(claim.publishReady).toBe(false);
		expect(claim.liveTestRecommended).toBe(true);
	});

	it('reports unproven when the fix target had simulated output', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({
				reachedSimulatedNodes: [{ nodeName: 'Send', reason: 'Sends a message' }],
			}),
			plannedNodeCount: 3,
			fixTargetNodeNames: ['Send'],
		});

		expect(claim.level).toBe('unproven');
		expect(claim.unprovenTargets).toEqual(['Send']);
	});

	it('stays partial when the fix target was proven but coverage was incomplete', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({ nodesNotReached: ['Log'] }),
			plannedNodeCount: 4,
			fixTargetNodeNames: ['Fetch'],
		});

		expect(claim.level).toBe('partial');
		expect(claim.unprovenTargets).toEqual([]);
	});

	it('never reports unproven when no fix target is known', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({ nodesNotReached: ['Send'] }),
			plannedNodeCount: 4,
		});

		expect(claim.level).toBe('partial');
	});

	it('deduplicates repeated fix targets', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({ nodesNotReached: ['Send'] }),
			plannedNodeCount: 4,
			fixTargetNodeNames: ['Send', 'Send'],
		});

		expect(claim.unprovenTargets).toEqual(['Send']);
	});

	it('reports failed on a failed run regardless of coverage', () => {
		const claim = deriveVerificationClaim({
			analysis: makeAnalysis({
				success: false,
				nodeErrors: [{ nodeName: 'Fetch', message: 'boom' }],
			}),
			plannedNodeCount: 3,
			fixTargetNodeNames: ['Fetch'],
		});

		expect(claim.level).toBe('failed');
		expect(claim.publishReady).toBe(false);
		expect(claim.liveTestRecommended).toBe(false);
	});
});
