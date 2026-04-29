import { z } from 'zod';
import { Z } from '../../zod-class';

const governanceDefaultBehaviorSchema = z.enum(['allow', 'block']);

export class UpdateGovernanceSettingsDto extends Z.class({
	defaultBehavior: governanceDefaultBehaviorSchema,
}) {}

export class UpdateProjectGovernanceSettingsDto extends Z.class({
	defaultBehavior: governanceDefaultBehaviorSchema.nullable(),
}) {}
