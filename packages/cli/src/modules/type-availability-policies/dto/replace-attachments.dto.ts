import { Z } from '@n8n/api-types';
import { z } from 'zod';

const policyAttachmentInputSchema = z.object({
	policyId: z.string().min(1),
	priority: z.number().int(),
	isFloor: z.boolean(),
});

const replaceAttachmentsShape = {
	attachments: z.array(policyAttachmentInputSchema),
};

/**
 * Both checks below mirror invariants enforced by a DB unique index further downstream.
 * Failing fast here gives a clean validation error instead of a raw constraint violation.
 */
const replaceAttachmentsSchema = z
	.object(replaceAttachmentsShape)
	.refine(
		(value) => {
			const policyIds = value.attachments.map((attachment) => attachment.policyId);
			return policyIds.length === new Set(policyIds).size;
		},
		{ message: 'Duplicate policyId values are not allowed', path: ['attachments'] },
	)
	.refine(
		(value) => {
			const floorPriorityPairs = value.attachments.map(
				(attachment) => `${attachment.isFloor}:${attachment.priority}`,
			);
			return floorPriorityPairs.length === new Set(floorPriorityPairs).size;
		},
		{ message: 'Duplicate (isFloor, priority) pairs are not allowed', path: ['attachments'] },
	);

/** Request body for replacing every attachment on a scope. */
export class ReplaceAttachmentsDto extends Z.class(replaceAttachmentsShape) {
	constructor(data: z.infer<typeof replaceAttachmentsSchema>) {
		super(replaceAttachmentsSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return replaceAttachmentsSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return replaceAttachmentsSchema.parse(data);
	}
}
