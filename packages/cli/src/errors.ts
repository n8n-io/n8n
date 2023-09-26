export class BinaryDataS3NotLicensedError extends Error {
	constructor() {
		super(
			'Binary data storage in S3 is not available with your current license. Please upgrade to a license that supports this feature, or set N8N_DEFAULT_BINARY_DATA_MODE to an option other than s3.',
		);
	}
}
