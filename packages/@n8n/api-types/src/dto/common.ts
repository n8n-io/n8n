import { z } from 'zod';

export const booleanLiteral = z.union([z.literal('true'), z.literal('false')]);
