import { AwsTranscribe } from '../AwsTranscribe.node';
import { awsNodeAuthOptions, awsNodeCredentials } from '../../utils';

describe('AwsTranscribe node description', () => {
	const node = new AwsTranscribe();

	it('exposes the AWS authentication options as the first property', () => {
		expect(node.description.properties[0]).toEqual(awsNodeAuthOptions);
	});

	it('declares the iam and assumeRole credentials', () => {
		expect(node.description.credentials).toEqual(awsNodeCredentials);
	});
});
