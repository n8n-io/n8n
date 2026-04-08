import { z } from 'zod';

const illegalCharacterRegex = /[[\]^\\/:*?"<>|]/;
const dotsOnlyRegex = /^\.+$/;
const FOLDER_NAME_MAX_LENGTH = 128;

export const folderNameSchema = z
	.string()
	.trim()
	.superRefine((name, ctx) => {
		if (name === '') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Folder name cannot be empty',
			});
			return;
		}

		if (illegalCharacterRegex.test(name)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Folder name contains invalid characters',
			});
			return;
		}

		if (dotsOnlyRegex.test(name)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Folder name cannot consist of dots only',
			});
			return;
		}

		if (name.startsWith('.')) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Folder name cannot start with a dot',
			});
		}
	})
	.pipe(
		z.string().max(FOLDER_NAME_MAX_LENGTH, {
			message: `Folder name cannot be longer than ${FOLDER_NAME_MAX_LENGTH} characters`,
		}),
	);
export const folderIdSchema = z.string().max(36);
