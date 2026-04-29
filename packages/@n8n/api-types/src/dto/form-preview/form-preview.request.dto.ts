import { z } from 'zod';

import { Z } from '../../zod-class';

const formFieldSchema = z.record(z.unknown());

export class FormPreviewRequestDto extends Z.class({
	formTitle: z.string().default(''),
	formDescription: z.string().default(''),
	formFields: z.array(formFieldSchema).default([]),
	buttonLabel: z.string().optional(),
	nodeVersion: z.number().optional(),
	customCss: z.string().optional(),
	appendAttribution: z.boolean().optional(),
	isCompletion: z.boolean().optional(),
}) {}
