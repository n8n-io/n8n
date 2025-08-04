import { z } from 'zod';

export const passwordResetTokenSchema = z.string().min(10, 'Token too short');
