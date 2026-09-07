import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

export class TagIdsPublicDto extends Z.array(
	z.object({ id: z.string().openapi({ example: '2tUt1wbLX592XDdX' }) }).strict(),
) {}

export class WorkflowTagsPublicDto extends Z.array(tagPublicSchema) {}
