import { awsNodeAuthOptions, awsNodeCredentials } from '../../utils';
import { AwsIam } from '../AwsIam.node';

describe('AwsIam node description', () => {
	const node = new AwsIam();

	it('exposes the AWS authentication options as the first property', () => {
		expect(node.description.properties[0]).toEqual(awsNodeAuthOptions);
	});

	it('declares the iam and assumeRole credentials', () => {
		expect(node.description.credentials).toEqual(awsNodeCredentials);
	});
});
