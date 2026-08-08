import { z } from 'zod';

import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

export class TagIdsPublicDto extends Z.array(z.object({ id: z.string() })) {}

export class WorkflowTagsPublicDto extends Z.array(tagPublicSchema) {}
