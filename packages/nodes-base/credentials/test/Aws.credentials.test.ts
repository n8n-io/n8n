import { Aws, type AwsCredentialsType } from '../Aws.credentials';

function buildAwsCredentials(creds: Partial<AwsCredentialsType> = {}): AwsCredentialsType {
	return {
		region: 'us-east-1',
		accessKeyId: 'accessKeyId',
		secretAccessKey: 'secretAccessKey',
		temporaryCredentials: false,
		customEndpoints: false,
		...creds,
	};
}

describe('AWS credentials', () => {
	beforeAll(() => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2020-01-01'));
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	describe('authenticate', () => {
		it('should sign requests for regional AWS services', async () => {
			const credential = new Aws();
			const { headers } = await credential.authenticate(buildAwsCredentials(), {
				url: 'https://s3.eu-central-1.amazonaws.com',
			});
			expect(headers).toEqual({
				Authorization:
					'AWS4-HMAC-SHA256 Credential=accessKeyId/20200101/eu-central-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=38045964b530976bee64b5241ebebb7e0c09b0a15fb425579c6ea26cc2fa0667',
				Host: 's3.eu-central-1.amazonaws.com',
				'X-Amz-Content-Sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				'X-Amz-Date': '20200101T000000Z',
			});
		});

		it('should sign requests for global AWS services', async () => {
			const credential = new Aws();
			const { headers } = await credential.authenticate(buildAwsCredentials(), {
				url: 'https://iam.amazonaws.com',
			});
			expect(headers).toEqual({
				Authorization:
					'AWS4-HMAC-SHA256 Credential=accessKeyId/20200101/us-east-1/iam/aws4_request, SignedHeaders=host;x-amz-date, Signature=13d4ff2c5882417eb57a3b6dcd0c40b0f37cea5d1b97c7abc2909f6f60912736',
				Host: 'iam.amazonaws.com',
				'X-Amz-Date': '20200101T000000Z',
			});
		});

		it('should sign requests with custom endpoints', async () => {
			const credential = new Aws();
			const { url } = await credential.authenticate(
				buildAwsCredentials({
					customEndpoints: true,
					region: 'eu-central-1',
					s3Endpoint: 'https://s3.{region}.customvpcendpoint.com',
				}),
				{
					url: '',
					qs: {
						service: 's3',
						region: 'eu-central-1',
						path: '',
					},
				},
			);
			expect(url).toEqual('https://s3.eu-central-1.customvpcendpoint.com/');
		});
	});
});
