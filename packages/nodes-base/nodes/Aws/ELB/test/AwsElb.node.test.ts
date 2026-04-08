import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('AWS ELB', () => {
	const credentials = {
		aws: {
			region: 'us-east-1',
			accessKeyId: 'test-access-key',
			secretAccessKey: 'test-secret-key',
		},
	};

	describe('Load Balancer Operations', () => {
		describe('Create Load Balancer', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock
					.get(
						'/?Action=CreateLoadBalancer&Version=2015-12-01&IpAddressType=ipv4&Name=test-lb&Scheme=internet-facing&Type=application&Subnets.member.1=subnet-12345&Subnets.member.2=subnet-67890&SecurityGroups.member.1=sg-12345&Tags.member.1.Key=Environment&Tags.member.1.Value=test',
					)
					.reply(
						200,
						`
						<CreateLoadBalancerResponse>
							<CreateLoadBalancerResult>
								<LoadBalancers>
									<member>
										<LoadBalancerArn>arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890123456</LoadBalancerArn>
										<LoadBalancerName>test-lb</LoadBalancerName>
										<Scheme>internet-facing</Scheme>
										<Type>application</Type>
										<State>
											<Code>provisioning</Code>
										</State>
									</member>
								</LoadBalancers>
							</CreateLoadBalancerResult>
						</CreateLoadBalancerResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['create-load-balancer.workflow.json'],
			});
		});

		describe('Get Load Balancer', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock
					.get(
						'/?Action=DescribeLoadBalancers&Version=2015-12-01&LoadBalancerArns.member.1=arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890123456',
					)
					.reply(
						200,
						`
						<DescribeLoadBalancersResponse>
							<DescribeLoadBalancersResult>
								<LoadBalancers>
									<member>
										<LoadBalancerArn>arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890123456</LoadBalancerArn>
										<LoadBalancerName>test-lb</LoadBalancerName>
										<Scheme>internet-facing</Scheme>
										<Type>application</Type>
										<State>
											<Code>active</Code>
										</State>
									</member>
								</LoadBalancers>
							</DescribeLoadBalancersResult>
						</DescribeLoadBalancersResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['get-load-balancer.workflow.json'],
			});
		});

		describe('Get Many Load Balancers', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock.get('/?Action=DescribeLoadBalancers&Version=2015-12-01&PageSize=10').reply(
					200,
					`
						<DescribeLoadBalancersResponse>
							<DescribeLoadBalancersResult>
								<LoadBalancers>
									<member>
										<LoadBalancerArn>arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb-1/1234567890123456</LoadBalancerArn>
										<LoadBalancerName>test-lb-1</LoadBalancerName>
										<Scheme>internet-facing</Scheme>
										<Type>application</Type>
									</member>
									<member>
										<LoadBalancerArn>arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/test-lb-2/2345678901234567</LoadBalancerArn>
										<LoadBalancerName>test-lb-2</LoadBalancerName>
										<Scheme>internal</Scheme>
										<Type>network</Type>
									</member>
								</LoadBalancers>
							</DescribeLoadBalancersResult>
						</DescribeLoadBalancersResponse>
					`,
				);

				mock
					.get(
						'/?Action=DescribeLoadBalancers&Version=2015-12-01&Names.member.1=test-lb-1&Names.member.2=test-lb-2',
					)
					.reply(
						200,
						`
						<DescribeLoadBalancersResponse>
							<DescribeLoadBalancersResult>
								<LoadBalancers>
									<member>
										<LoadBalancerArn>arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb-1/1234567890123456</LoadBalancerArn>
										<LoadBalancerName>test-lb-1</LoadBalancerName>
										<Scheme>internet-facing</Scheme>
										<Type>application</Type>
									</member>
									<member>
										<LoadBalancerArn>arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/test-lb-2/2345678901234567</LoadBalancerArn>
										<LoadBalancerName>test-lb-2</LoadBalancerName>
										<Scheme>internal</Scheme>
										<Type>network</Type>
									</member>
								</LoadBalancers>
							</DescribeLoadBalancersResult>
						</DescribeLoadBalancersResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: [
					'get-many-load-balancers.workflow.json',
					'get-many-load-balancers-with-names.workflow.json',
				],
			});
		});

		describe('Delete Load Balancer', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock
					.get(
						'/?Action=DeleteLoadBalancer&Version=2015-12-01&LoadBalancerArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/test-lb/1234567890123456',
					)
					.reply(
						200,
						`
						<DeleteLoadBalancerResponse>
							<DeleteLoadBalancerResult/>
						</DeleteLoadBalancerResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['delete-load-balancer.workflow.json'],
			});
		});
	});

	describe('Listener Certificate Operations', () => {
		describe('Add Listener Certificate', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock
					.get(
						'/?Action=AddListenerCertificates&Version=2015-12-01&Certificates.member.1.CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012&ListenerArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/test-lb/1234567890123456/f2f7dc8efc522ab2',
					)
					.reply(
						200,
						`
						<AddListenerCertificatesResponse>
							<AddListenerCertificatesResult>
								<Certificates>
									<member>
										<CertificateArn>arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012</CertificateArn>
										<IsDefault>false</IsDefault>
									</member>
								</Certificates>
							</AddListenerCertificatesResult>
						</AddListenerCertificatesResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['add-listener-certificate.workflow.json'],
			});
		});

		describe('Get Many Listener Certificates', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock
					.get(
						'/?Action=DescribeListenerCertificates&Version=2015-12-01&ListenerArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/test-lb/1234567890123456/f2f7dc8efc522ab2&PageSize=10',
					)
					.reply(
						200,
						`
						<DescribeListenerCertificatesResponse>
							<DescribeListenerCertificatesResult>
								<Certificates>
									<member>
										<CertificateArn>arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012</CertificateArn>
										<IsDefault>false</IsDefault>
									</member>
									<member>
										<CertificateArn>arn:aws:acm:us-east-1:123456789012:certificate/87654321-4321-4321-4321-210987654321</CertificateArn>
										<IsDefault>true</IsDefault>
									</member>
								</Certificates>
							</DescribeListenerCertificatesResult>
						</DescribeListenerCertificatesResponse>
					`,
					);

				mock
					.get(
						'/?Action=DescribeListenerCertificates&Version=2015-12-01&ListenerArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/test-lb/1234567890123456/f2f7dc8efc522ab2',
					)
					.reply(
						200,
						`
						<DescribeListenerCertificatesResponse>
							<DescribeListenerCertificatesResult>
								<Certificates>
									<member>
										<CertificateArn>arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012</CertificateArn>
										<IsDefault>false</IsDefault>
									</member>
									<member>
										<CertificateArn>arn:aws:acm:us-east-1:123456789012:certificate/87654321-4321-4321-4321-210987654321</CertificateArn>
										<IsDefault>true</IsDefault>
									</member>
								</Certificates>
							</DescribeListenerCertificatesResult>
						</DescribeListenerCertificatesResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: [
					'get-many-listener-certificates.workflow.json',
					'get-many-listener-certificates-all.workflow.json',
				],
			});
		});

		describe('Remove Listener Certificate', () => {
			beforeAll(() => {
				const mock = nock('https://elasticloadbalancing.us-east-1.amazonaws.com');

				mock
					.get(
						'/?Action=RemoveListenerCertificates&Version=2015-12-01&Certificates.member.1.CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012&ListenerArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/test-lb/1234567890123456/f2f7dc8efc522ab2',
					)
					.reply(
						200,
						`
						<RemoveListenerCertificatesResponse>
							<RemoveListenerCertificatesResult/>
						</RemoveListenerCertificatesResponse>
					`,
					);
			});

			new NodeTestHarness().setupTests({
				credentials,
				workflowFiles: ['remove-listener-certificate.workflow.json'],
			});
		});
	});
});
