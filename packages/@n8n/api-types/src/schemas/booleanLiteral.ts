import { z } from 'zod';

export const booleanLiteral = z.enum(['true', 'false']).transform((value) => value === 'true');
