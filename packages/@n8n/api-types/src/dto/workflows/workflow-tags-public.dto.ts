import { z } from 'zod';

import { Z } from '../../zod-class';
import { tagPublicSchema } from '../tag/tag-public.dto';

// `.strict()` because the replaced `tagIds.yml` set `additionalProperties: false`. Zod would
// otherwise drop an unknown field and return 200, so a caller sending e.g. `name` alongside `id`
// would be told their write succeeded while that part of it was discarded.
export class TagIdsPublicDto extends Z.array(z.object({ id: z.string() }).strict()) {}

// Deliberately not strict: this is a response DTO, validated on the way out, where a mismatch
// surfaces as a 500 rather than a 400.
export class WorkflowTagsPublicDto extends Z.array(tagPublicSchema) {}
