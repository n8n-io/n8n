import { registerAs } from '@nestjs/config';

export interface S3ConfigType {
	bucket: string;
	endpoint: string;
	region: string;
	accessKey: string;
	secretKey: string;
	authAutoDetect: boolean;
}

export default registerAs('s3', (): S3ConfigType => {
	const accessKey = process.env.COMMAND_SERVICE_S3_ACCESS_KEY ?? '';
	const secretKey = process.env.COMMAND_SERVICE_S3_SECRET_KEY ?? '';

	return {
		bucket: process.env.COMMAND_SERVICE_S3_BUCKET ?? '',
		endpoint: process.env.COMMAND_SERVICE_S3_ENDPOINT ?? '',
		region: process.env.COMMAND_SERVICE_S3_REGION ?? 'us-east-1',
		accessKey,
		secretKey,
		authAutoDetect: !accessKey || !secretKey,
	};
});
