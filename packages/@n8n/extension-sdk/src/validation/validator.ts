import type { ZodError } from 'zod';

import { type PluginManifest, pluginManifestSchema } from './schema';

export interface ValidationError {
	type: string;
	message: string;
	field?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
	manifest?: PluginManifest;
}

export class ManifestValidator {
	/**
	 * Validate a plugin manifest against the schema
	 */
	validate(manifestData: unknown): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationError[] = [];

		try {
			const manifest = pluginManifestSchema.parse(manifestData);

			return {
				valid: errors.length === 0,
				errors,
				warnings,
				manifest,
			};
		} catch (error) {
			if (this.isZodError(error)) {
				const zodErrors = this.formatZodErrors(error);
				return {
					valid: false,
					errors: zodErrors,
					warnings,
				};
			}

			return {
				valid: false,
				errors: [
					{
						type: 'validation-error',
						message: error instanceof Error ? error.message : 'Unknown validation error',
					},
				],
				warnings,
			};
		}
	}

	private isZodError(error: unknown): error is ZodError {
		return error !== null && typeof error === 'object' && 'issues' in error;
	}

	private formatZodErrors(error: ZodError): ValidationError[] {
		return error.issues.map((issue) => ({
			type: 'schema-validation',
			message: issue.message,
			field: issue.path.join('.'),
		}));
	}
}
