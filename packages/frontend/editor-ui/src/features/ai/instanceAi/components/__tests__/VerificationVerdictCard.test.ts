import type { InstanceAiVerificationClaim } from '@n8n/api-types';
import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import VerificationVerdictCard from '../VerificationVerdictCard.vue';

const renderComponent = createComponentRenderer(VerificationVerdictCard);

function makeClaim(
	overrides: Partial<InstanceAiVerificationClaim> = {},
): InstanceAiVerificationClaim {
	return {
		level: 'partial',
		plannedNodeCount: 11,
		reachedNodeCount: 4,
		nodesNotReached: ['Send Email', 'Log Row'],
		simulatedNodes: [{ nodeName: 'Create Event', reason: 'Creates a record' }],
		pinnedNodes: [],
		unprovenTargets: [],
		publishReady: false,
		liveTestRecommended: true,
		...overrides,
	};
}

describe('VerificationVerdictCard', () => {
	it('states partial coverage with the unreached nodes', () => {
		const { getByText, getByTestId } = renderComponent({ props: { claim: makeClaim() } });

		expect(getByTestId('instance-ai-verification-verdict')).toBeInTheDocument();
		expect(getByText('Not fully verified')).toBeInTheDocument();
		expect(
			getByText('2 of 11 nodes were never reached, so they are unverified: Send Email, Log Row.'),
		).toBeInTheDocument();
		expect(
			getByText('Output was simulated, so nothing real happened at: Create Event.'),
		).toBeInTheDocument();
	});

	it('states the verdict and nothing else', () => {
		// No call to action: what to do next depends on setup state the card
		// cannot see, so the assistant owns that and the card owns the facts.
		const { getByTestId } = renderComponent({ props: { claim: makeClaim() } });

		expect(getByTestId('instance-ai-verification-verdict').textContent).not.toMatch(/live/i);
	});

	it('leads with the unproven fix target', () => {
		const { getByText } = renderComponent({
			props: { claim: makeClaim({ level: 'unproven', unprovenTargets: ['Log Row'] }) },
		});

		expect(getByText('Changed, but not verified')).toBeInTheDocument();
		expect(
			getByText('This change was about Log Row, and that was never proven.'),
		).toBeInTheDocument();
	});

	it('calls out pinned output separately, because the remedy differs', () => {
		const { getByText } = renderComponent({
			props: { claim: makeClaim({ pinnedNodes: ['Fetch Rows'] }) },
		});

		expect(
			getByText(
				'Some output came from pinned data saved on the workflow: Fetch Rows. Remove those pins for a live test.',
			),
		).toBeInTheDocument();
	});

	it('caps a long node list so it cannot flood the card', () => {
		const many = Array.from({ length: 11 }, (_, i) => `Node ${i + 1}`);
		const { getByText } = renderComponent({
			props: { claim: makeClaim({ nodesNotReached: many, plannedNodeCount: 12 }) },
		});

		expect(getByText(/Node 8 and 3 more\.$/)).toBeInTheDocument();
	});

	it('titles a failed verification', () => {
		const { queryByText } = renderComponent({
			props: { claim: makeClaim({ level: 'failed', liveTestRecommended: false }) },
		});

		expect(queryByText('Verification did not pass')).toBeInTheDocument();
	});
});
