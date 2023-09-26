export class ExternalStorageUnlicensedError extends Error {
	message =
		'Binary data storage in S3 is not available with your current license. Please upgrade to a license that supports this feature, or set N8N_DEFAULT_BINARY_DATA_MODE to an option other than s3.';
}

export class ExternalStorageUnavailableError extends Error {
	message =
		'External storage selected but unavailable. Include "s3" when setting N8N_AVAILABLE_BINARY_DATA_MODES.';
}
