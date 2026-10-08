import {
	automationProposalCardSchema,
	automationRecommendationReasonSchema,
	automationRunTargetSchema,
} from '@n8n/api-types';
import fc from 'fast-check';
import type { z } from 'zod';

import type {
	RecommendationReason,
	RunTargetOption,
	RunTargetRecommendation,
} from '../run-target-recommendation';
import { recommendRunTarget } from '../run-target-recommendation';

// The automation card of the n8n Assistant sends the recommendation to the frontend. Typecheck
// fails here when the recommendation and the card schema of @n8n/api-types drift apart.
describe('run-target recommendation and the automation card schema', () => {
	it('use the same recommendation reasons', () => {
		expectTypeOf<RecommendationReason>().toEqualTypeOf<
			z.infer<typeof automationRecommendationReasonSchema>
		>();
	});

	it('use the same target kinds and statuses', () => {
		type CardTarget = z.infer<typeof automationRunTargetSchema>;
		expectTypeOf<RunTargetOption['kind']>().toEqualTypeOf<CardTarget['kind']>();
		expectTypeOf<RunTargetOption['status']>().toEqualTypeOf<CardTarget['status']>();
	});

	it('can put every recommendation on the card', () => {
		type CardRecommendation = z.infer<typeof automationProposalCardSchema>['recommended'];
		expectTypeOf<RunTargetRecommendation>().toMatchTypeOf<CardRecommendation>();
	});

	const nodeType = fc.oneof(
		fc.constantFrom(
			'n8n-nodes-base.manualTrigger',
			'n8n-nodes-base.scheduleTrigger',
			'n8n-nodes-base.webhook',
			'n8n-nodes-base.readWriteFile',
			'n8n-nodes-base.executeCommand',
			'n8n-nodes-base.localFileTrigger',
			'n8n-nodes-base.slack',
		),
		fc.string(),
	);
	const target = fc.record({
		id: fc.string({ minLength: 1 }),
		kind: fc.constantFrom<RunTargetOption['kind']>('local', 'linked'),
		label: fc.string(),
		status: fc.constantFrom<RunTargetOption['status']>(
			'online',
			'offline',
			'unauthorised',
			'unknown',
		),
	});

	const recommendedSchema = automationProposalCardSchema.shape.recommended;

	it('gives a recommendation that the card schema accepts and that names a target (property)', () => {
		fc.assert(
			fc.property(
				fc.array(nodeType, { maxLength: 8 }),
				fc.array(target, { maxLength: 4 }),
				(nodeTypes, targets) => {
					const recommendation = recommendRunTarget({ nodeTypes, targets });

					expect(recommendedSchema.parse(recommendation)).toEqual(recommendation);
					// Without targets, the recommendation names this instance.
					const targetIds = targets.length > 0 ? targets.map((t) => t.id) : ['local'];
					expect(targetIds).toContain(recommendation.targetId);
				},
			),
			{ numRuns: 300 },
		);
	});

	it('recommends a linked target only when it is one of the linked targets (property)', () => {
		fc.assert(
			fc.property(
				fc.array(nodeType, { maxLength: 8 }),
				fc.array(target, { maxLength: 4 }),
				(nodeTypes, targets) => {
					const recommendation = recommendRunTarget({ nodeTypes, targets });

					if (recommendation.kind !== 'linked') return;
					const linkedIds = targets.filter((t) => t.kind === 'linked').map((t) => t.id);
					expect(linkedIds).toContain(recommendation.targetId);
				},
			),
			{ numRuns: 300 },
		);
	});
});
