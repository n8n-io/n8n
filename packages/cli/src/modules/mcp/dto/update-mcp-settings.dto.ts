import { Z } from '@n8n/api-types';
import { z } from 'zod';

const updateMcpSettingsShape = {
	mcpAccessEnabled: z.boolean().optional(),
	autoExposeNewWorkflows: z.boolean().optional(),
};

const updateMcpSettingsSchema = z
	.object(updateMcpSettingsShape)
	.refine(
		(value) => value.mcpAccessEnabled !== undefined || value.autoExposeNewWorkflows !== undefined,
		{ message: 'Provide at least one of mcpAccessEnabled or autoExposeNewWorkflows' },
	);

export class UpdateMcpSettingsDto extends Z.class(updateMcpSettingsShape) {
	constructor(data: z.infer<typeof updateMcpSettingsSchema>) {
		super(updateMcpSettingsSchema.parse(data));
	}

	static override safeParse(data: unknown) {
		return updateMcpSettingsSchema.safeParse(data);
	}

	static override parse(data: unknown) {
		return updateMcpSettingsSchema.parse(data);
	}
}
