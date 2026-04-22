import { z } from 'zod';

import { baseWorkflowShape } from './base-workflow.dto';
import { Z } from '../../zod-class';

export class UpdateWorkflowDto extends Z.class(
	// Make all base fields optional for partial updates
	z.object(baseWorkflowShape).partial().shape,
) {}
