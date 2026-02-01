import { z } from 'zod';
import { Z } from 'zod-class';

import { baseWorkflowShape } from './base-workflow.dto';

export class UpdateWorkflowDto extends Z.class(
	// Make all base fields optional for partial updates
	z.object(baseWorkflowShape).partial().shape,
) {}
