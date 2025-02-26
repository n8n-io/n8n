/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable n8n-local-rules/no-plain-errors */
import { z } from 'zod';
import { Z } from 'zod-class';

// Define the input Params type
export type Params = {
	filter?: string;
	skip?: string;
	take?: string;
	select?: string;
	sortBy?: string;
};

// Define the output Options type
export type Options = {
	filter?: Record<string, unknown>;
	select?: Record<string, true>;
	skip?: number;
	take?: number;
	sortBy?: string;
};

// Valid select fields
const validSelectFields = [
	'id',
	'name',
	'createdAt',
	'updatedAt',
	'project',
	'tags',
	'parentFolder',
	'workflowsCount',
] as const;

// Valid sort fields and directions
const validSortFields = ['name', 'createdAt', 'updatedAt'] as const;
const validSortDirections = ['asc', 'desc'] as const;

// Filter class
export class FilterDto extends Z.class({
	parentFolderId: z.string().optional(),
	name: z.string().optional(),
}) {}

// Query params validation class
// Define the schema with transformations
const queryParamsSchema = {
	filter: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return undefined;
			try {
				const parsed = JSON.parse(val);
				return FilterDto.parse(parsed);
			} catch (e) {
				throw new Error('Invalid filter format');
			}
		}),

	skip: z
		.string()
		.optional()
		.transform((val) => (val ? parseInt(val, 10) : undefined)),

	take: z
		.string()
		.optional()
		.transform((val) => (val ? parseInt(val, 10) : undefined)),

	select: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return undefined;

			let fields: string[] = [];

			// Try to parse as JSON if it starts with [ or {
			if (val.trim().startsWith('[') || val.trim().startsWith('{')) {
				try {
					const parsed = JSON.parse(val);
					// Handle array format: ["name", "id"]
					if (Array.isArray(parsed)) {
						fields = parsed.map((field) => String(field).trim());
					}
					// Handle object format: {"name": true, "id": true}
					else if (typeof parsed === 'object' && parsed !== null) {
						fields = Object.keys(parsed);
					}
				} catch (e) {
					// If JSON parsing fails, fall back to comma-separated
					fields = val.split(',').map((field) => field.trim());
				}
			} else {
				// Regular comma-separated format
				fields = val.split(',').map((field) => field.trim());
			}

			// Build the select object
			const selectObject: Record<string, true> = {};
			for (const field of fields) {
				if (validSelectFields.includes(field as any)) {
					selectObject[field] = true;
				} else {
					throw new Error(`Invalid select field: ${field}`);
				}
			}

			return Object.keys(selectObject).length > 0 ? selectObject : undefined;
		}),
	sortBy: z
		.string()
		.optional()
		.refine(
			(val) => {
				if (!val) return true;

				const allowedSortOptions = [
					'name:asc',
					'name:desc',
					'createdAt:asc',
					'createdAt:desc',
					'updatedAt:asc',
					'updatedAt:desc',
				];

				return allowedSortOptions.includes(val);
			},
			{
				message:
					'sortBy must be one of: name:asc, name:desc, createdAt:asc, createdAt:desc, updatedAt:asc, updatedAt:desc',
			},
		),
};

// Create the class with the schema
export class ListFolderQueryDto extends Z.class(queryParamsSchema) {}
