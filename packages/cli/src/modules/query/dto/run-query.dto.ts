import { Z } from '@n8n/api-types';
import { z } from 'zod';

// TODO(M0): move to @n8n/api-types alongside the dashboards types
export class RunQueryDto extends Z.class({
	query: z.string().min(1),
	timeoutMs: z.number().int().positive().optional(),
}) {}
