import { z } from 'zod';
import { Z } from 'zod-class';

const ProtocolSchema = z.enum(['ssh', 'https']);
const KeyPairTypeSchema = z.enum(['ed25519', 'rsa']);

// Custom Git URL validation that accepts both HTTPS and SSH formats
const GitUrlSchema = z.string().refine(
	(url) => {
		// SSH format: git@hostname:user/repo.git
		const sshPattern = /^git@[\w.-]+:[\w.-]+\/[\w.-]+(\.git)?$/;
		// HTTPS format: https://hostname/user/repo.git
		const httpsPattern = /^https:\/\/[\w.-]+\/[\w.-]+\/[\w.-]+(\.git)?$/;

		return sshPattern.test(url) || httpsPattern.test(url);
	},
	{ message: 'Repository URL must be a valid Git SSH or HTTPS URL' },
);

const SourceControlPreferencesBaseSchema = {
	repositoryUrl: GitUrlSchema.optional(),
	branchName: z.string().min(1).optional(),
	branchReadOnly: z.boolean().optional(),
	branchColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Branch color must be a valid hex color')
		.optional(),
	protocol: ProtocolSchema.optional(),
	username: z.string().min(1).optional(),
	personalAccessToken: z.string().min(1).optional(),
	initRepo: z.boolean().optional(),
	keyGeneratorType: KeyPairTypeSchema.optional(),
};

// Create the base schema object
const BaseSourceControlPreferencesSchema = z.object(SourceControlPreferencesBaseSchema);

/**
 * DTO for updating source control preferences.
 * Includes cross-field validation for HTTPS protocol requirements.
 */
export class SourceControlPreferencesRequestDto extends Z.class(
	SourceControlPreferencesBaseSchema,
) {
	/**
	 * Custom validation to ensure HTTPS fields are provided when protocol is 'https'
	 */
	static validate(
		data: unknown,
	): z.SafeParseReturnType<unknown, SourceControlPreferencesRequestDto> {
		const result = BaseSourceControlPreferencesSchema.safeParse(data);

		if (!result.success) {
			return result;
		}

		const { protocol, username, personalAccessToken } = result.data;

		// If protocol is explicitly set to 'https', validate required fields
		if (protocol === 'https') {
			const errors: z.ZodIssue[] = [];

			if (!username) {
				errors.push({
					code: z.ZodIssueCode.custom,
					path: ['username'],
					message: 'Username is required when using HTTPS protocol',
				});
			}

			if (!personalAccessToken) {
				errors.push({
					code: z.ZodIssueCode.custom,
					path: ['personalAccessToken'],
					message: 'Personal access token is required when using HTTPS protocol',
				});
			}

			if (errors.length > 0) {
				return {
					success: false,
					error: new z.ZodError(errors),
				};
			}
		}

		return {
			success: true,
			data: result.data,
		};
	}
}

/**
 * Schema for source control preferences response.
 * Excludes sensitive fields like personalAccessToken in responses.
 */
export const SourceControlPreferencesResponseSchema = z.object({
	connected: z.boolean(),
	repositoryUrl: z.string().optional(),
	branchName: z.string().optional(),
	branchReadOnly: z.boolean().optional(),
	branchColor: z.string().optional(),
	protocol: ProtocolSchema.optional(),
	username: z.string().optional(),
	publicKey: z.string().optional(),
	keyGeneratorType: KeyPairTypeSchema.optional(),
});

export type SourceControlPreferencesResponse = z.infer<
	typeof SourceControlPreferencesResponseSchema
>;
