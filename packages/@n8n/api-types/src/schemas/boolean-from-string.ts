import { z } from 'zod';

export const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');
