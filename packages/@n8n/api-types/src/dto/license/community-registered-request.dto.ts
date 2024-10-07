import { z } from 'zod';
import { Z } from 'zod-class';

export class CommunityRegisteredRequestDto extends Z.class({ email: z.string().email() }) {}
