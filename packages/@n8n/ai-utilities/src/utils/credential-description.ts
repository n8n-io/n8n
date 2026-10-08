import { truncate } from '@n8n/utils/string/truncate';

/** Keep credential lists small enough for model context. */
export const CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH = 256;

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
