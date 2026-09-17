import { CREDENTIAL_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { truncate } from '@n8n/utils/string/truncate';

/** Keep credential lists small enough for model context. */
export const CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH = Math.min(
	256,
	CREDENTIAL_DESCRIPTION_MAX_LENGTH,
);

export function getCredentialDescriptionPreview(
	description: string | null | undefined,
): string | null {
	if (!description) return null;
	if (description.length <= CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH) return description;

	const prefixLength = CREDENTIAL_DESCRIPTION_PREVIEW_MAX_LENGTH - '...'.length;
	// Keep a Unicode character intact at the preview boundary.
	const splitsCharacter = (description.codePointAt(prefixLength - 1) ?? 0) > 0xffff;
	return truncate(description, splitsCharacter ? prefixLength - 1 : prefixLength);
}
