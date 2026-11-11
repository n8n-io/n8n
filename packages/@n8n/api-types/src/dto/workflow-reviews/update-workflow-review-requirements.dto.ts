import { Z } from '../../zod-class';
import { reviewRequirementPatchSchema } from '../../workflow-reviews-policy';

export class UpdateWorkflowReviewRequirementsDto extends Z.class(
	reviewRequirementPatchSchema.shape,
) {}
