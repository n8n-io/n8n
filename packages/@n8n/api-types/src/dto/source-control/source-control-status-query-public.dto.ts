import { z } from 'zod';

import { Z } from '../../zod-class';

export class SourceControlStatusQueryPublicDto extends Z.class({
	direction: z.enum(['push', 'pull']),
}) {}
