import {
	describeClaimLiveState,
	formatClaimDisclosure,
	formatClaimHeadline,
} from '../render-claim';
import type { VerificationClaim } from '../workflow-loop-state';

function makeClaim(overrides: Partial<VerificationClaim> = {}): VerificationClaim {
	return {
		level: 'verified',
		plannedNodeCount: 3,
		reachedNodeCount: 3,
		nodesNotReached: [],
		simulatedNodes: [],
		pinnedNodes: [],
		unprovenTargets: [],
		publishReady: true,
		liveTestRecommended: false,
		...overrides,
	};
}

describe('render-claim', () => {
	describe('describeClaimLiveState', () => {
		it('states the fact without telling anyone to publish', () => {
			// This sentence renders inside the publish approval the user reads
			// before clicking. An instruction to publish would argue for the very
			// click being weighed.
			const note = describeClaimLiveState(makeClaim({ liveState: 'live-stale' }));

			expect(note).toContain('The live version is still the previous one');
			expect(note).not.toMatch(/publish/i);
		});

		it('says nothing when the live version is current or the workflow is unpublished', () => {
			expect(describeClaimLiveState(makeClaim({ liveState: 'live-current' }))).toBeUndefined();
			expect(describeClaimLiveState(makeClaim({ liveState: 'unpublished' }))).toBeUndefined();
			expect(describeClaimLiveState(makeClaim())).toBeUndefined();
		});
	});

	describe('formatClaimHeadline', () => {
		it('separates a verified draft from a verified live workflow', () => {
			expect(formatClaimHeadline(makeClaim({ liveState: 'live-stale' }))).toBe(
				'Verified in the draft, NOT live.',
			);
			expect(formatClaimHeadline(makeClaim({ liveState: 'live-current' }))).toBe(
				'Verified end to end.',
			);
		});
	});

	describe('formatClaimDisclosure', () => {
		it('discloses nothing for a verified claim — publishing is the remedy, not the risk', () => {
			expect(formatClaimDisclosure(makeClaim({ liveState: 'live-stale' }))).toBeUndefined();
			expect(formatClaimDisclosure(makeClaim())).toBeUndefined();
		});

		it('carries the coverage facts for a claim below verified', () => {
			const disclosure = formatClaimDisclosure(
				makeClaim({
					level: 'partial',
					nodesNotReached: ['Send Email'],
					publishReady: false,
					liveTestRecommended: true,
				}),
			);

			expect(disclosure).toContain('NOT fully verified');
			expect(disclosure).toContain('Send Email');
		});

		it('never instructs the reader to publish — this text is the publish approval', () => {
			// A partial claim on a stale live workflow is the case that reaches the
			// approval card, next to guidance saying "publish only if they ask".
			const disclosure = formatClaimDisclosure(
				makeClaim({
					level: 'partial',
					liveState: 'live-stale',
					nodesNotReached: ['Send Email'],
					publishReady: false,
					liveTestRecommended: true,
				}),
			);

			expect(disclosure).toContain('The live version is still the previous one');
			expect(disclosure).not.toMatch(/publish/i);
		});
	});
});
