import { automationMapScopeSchema } from '../../schemas/automation-map.schema';
import { Z } from '../../zod-class';

export class PreviewAutomationMapScopeDto extends Z.class({
	scope: automationMapScopeSchema,
}) {}
