import { z } from 'zod';
import { Z } from 'zod-class';

const StringBooleanEnum = z.enum(['true', 'false']).optional();

export class RetrieveTagQueryDto extends Z.class({
	withUsageCount: StringBooleanEnum,
}) {}
