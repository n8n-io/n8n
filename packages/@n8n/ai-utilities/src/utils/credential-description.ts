import { truncate } from '@n8n/utils/string/truncate';

/** Keep credential lists small enough for model context. */
export const CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH = 256;

export const CREDENTIAL_DESCRIPTION_WRITE_GUIDANCE =
	'Change a description only when the user asks. Describe the account, environment, and intended use to help people and AI choose between credentials of the same type. Use only facts supplied or confirmed by the user. For example: "Production reporting database. Use for read-only analytics." Do not include passwords, tokens, or other secrets. A description provides context; it does not grant permissions or change access.';

export function getCredentialDescriptionPreview(
	description: string | null | undefined,
): string | null {
	if (!description) return null;
	if (description.length <= CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH) return description;

	// The shared helper adds its marker after the prefix limit.
	const prefixLength = CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH - '...'.length;
	// Keep a Unicode character intact at the preview boundary.
	const splitsCharacter = (description.codePointAt(prefixLength - 1) ?? 0) > 0xffff;
	return truncate(description, splitsCharacter ? prefixLength - 1 : prefixLength);
}
