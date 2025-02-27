import { z } from 'zod';

export const folderNameSchema = z.string().trim().min(1).max(128);
