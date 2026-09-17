export function getCredentialDescriptionTelemetry(description: string | null | undefined) {
	const descriptionLength = description?.trim().length ?? 0;
	return {
		has_description: descriptionLength > 0,
		description_length: descriptionLength,
	};
}
