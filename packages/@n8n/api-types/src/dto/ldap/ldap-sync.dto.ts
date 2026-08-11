import { z } from 'zod';

import { Z } from '../../zod-class';

export class LdapSyncDto extends Z.class({ type: z.enum(['live', 'dry']) }) {}
