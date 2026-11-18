import { instanceAiApprovalModeSchema } from '../../schemas/instance-ai-approval.schema';
import { Z } from '../../zod-class';

export class InstanceAiUserPreferencesUpdateRequestDto extends Z.class({
	approvalMode: instanceAiApprovalModeSchema,
}) {}
