import { awsNodeAuthOptions, awsNodeCredentials } from '../../utils';
import { AwsCognito } from '../AwsCognito.node';

describe('AwsCognito node description', () => {
	const node = new AwsCognito();

	it('exposes the AWS authentication options as the first property', () => {
		expect(node.description.properties[0]).toEqual(awsNodeAuthOptions);
	});

	it('declares the iam and assumeRole credentials', () => {
		expect(node.description.credentials).toEqual(awsNodeCredentials);
	});
});
