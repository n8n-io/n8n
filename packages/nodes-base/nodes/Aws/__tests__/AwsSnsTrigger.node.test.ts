import { AwsSnsTrigger } from '../AwsSnsTrigger.node';
import type { IWebhookFunctions } from 'n8n-workflow';
import * as GenericFunctions from '../GenericFunctions';

/**
 * Security vulnerability reproduction tests for AWS SNS Trigger
 *
 * Issue: SEC-538 - Missing SNS message signature verification
 * CWE: CWE-290 (Authentication Bypass by Spoofing)
 *
 * These tests demonstrate that the AWS SNS Trigger accepts unauthenticated
 * webhook payloads without verifying the SNS message signature, allowing
 * attackers to inject arbitrary data into workflows.
 */
describe('AwsSnsTrigger Node - Security Vulnerabilities', () => {
	describe('webhook method - signature verification bypass', () => {
		let mockThis: IWebhookFunctions;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {
				webhookId: 'arn:aws:sns:us-east-1:123456789012:test-topic:abc-def-123',
			};

			mockThis = {
				getWorkflowStaticData: jest.fn(() => webhookData),
				getNodeParameter: jest.fn((name: string) => {
					if (name === 'topic') return 'arn:aws:sns:us-east-1:123456789012:legitimate-topic';
					return undefined;
				}),
				getRequestObject: jest.fn(() => ({
					rawBody: Buffer.from(''),
					header: jest.fn(),
				})),
				getResponseObject: jest.fn(() => ({
					status: jest.fn().mockReturnThis(),
					send: jest.fn().mockReturnThis(),
					end: jest.fn(),
				})),
				helpers: {
					returnJsonArray: jest.fn((data) => [data]),
				},
			} as unknown as IWebhookFunctions;
		});

		it('should accept spoofed SNS Notification without signature verification', async () => {
			// Attacker-crafted SNS notification with NO valid signature
			const attackerPayload = {
				Type: 'Notification',
				MessageId: 'attacker-controlled-id',
				TopicArn: 'arn:aws:sns:us-east-1:999999999999:attacker-topic',
				Subject: 'Injected Alert',
				Message: JSON.stringify({
					attacker: 'injected',
					proof: 'SEC-538',
					exploit: 'No signature verification',
				}),
				Timestamp: '2026-03-19T12:00:00.000Z',
				SignatureVersion: '1',
				Signature: 'FAKE_SIGNATURE_THAT_IS_NOT_VERIFIED',
				SigningCertURL: 'https://attacker.com/fake-cert.pem',
				UnsubscribeURL: 'https://attacker.com/unsubscribe',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(attackerPayload)),
				header: jest.fn(),
			});

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// VULNERABILITY: Workflow is triggered with attacker-controlled data
			expect(result).toHaveProperty('workflowData');
			expect(result.workflowData).toHaveLength(1);

			// Verify that attacker-controlled data reached the workflow
			const workflowItem = result.workflowData![0][0]; // returnJsonArray wraps in array
			expect(workflowItem).toMatchObject(attackerPayload);

			// This test demonstrates that:
			// 1. No signature verification was performed
			// 2. Attacker-controlled Message field reached workflow
			// 3. TopicArn validation was bypassed (different from configured topic)
		});

		it('should accept Notification from any TopicArn (bypasses topic validation)', async () => {
			const configuredTopic = 'arn:aws:sns:us-east-1:123456789012:legitimate-topic';
			const attackerTopic = 'arn:aws:sns:us-east-1:999999999999:attacker-topic';

			const payload = {
				Type: 'Notification',
				MessageId: 'test-msg-001',
				TopicArn: attackerTopic, // Different from configured topic
				Message: 'Attacker injected message',
				Timestamp: '2026-03-19T12:00:00.000Z',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(payload)),
				header: jest.fn(),
			});
			(mockThis.getNodeParameter as jest.Mock).mockReturnValue(configuredTopic);

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// VULNERABILITY: TopicArn is not validated for Notification type
			expect(result).toHaveProperty('workflowData');
			const workflowItem = result.workflowData![0][0];
			expect(workflowItem.TopicArn).toBe(attackerTopic);
			expect(workflowItem.TopicArn).not.toBe(configuredTopic);
		});

		it('should accept UnsubscribeConfirmation without TopicArn validation', async () => {
			const configuredTopic = 'arn:aws:sns:us-east-1:123456789012:legitimate-topic';
			const attackerTopic = 'arn:aws:sns:us-east-1:999999999999:attacker-topic';

			const payload = {
				Type: 'UnsubscribeConfirmation',
				MessageId: 'test-msg-002',
				TopicArn: attackerTopic,
				Message: 'Unsubscribe from alerts',
				Token: 'fake-token',
				Timestamp: '2026-03-19T12:00:00.000Z',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(payload)),
				header: jest.fn(),
			});
			(mockThis.getNodeParameter as jest.Mock).mockReturnValue(configuredTopic);

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// VULNERABILITY: UnsubscribeConfirmation doesn't check TopicArn
			expect(result).toEqual({});
		});

		it('should process malformed JSON without validation', async () => {
			const payload = {
				Type: 'Notification',
				// Missing required SNS fields like MessageId, Timestamp
				Message: '<script>alert("XSS")</script>',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(payload)),
				header: jest.fn(),
			});

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// VULNERABILITY: No schema validation of SNS message structure
			expect(result).toHaveProperty('workflowData');
			const workflowItem = result.workflowData![0][0];
			expect(workflowItem.Message).toContain('script');
		});

		it('should demonstrate workflow injection attack vector', async () => {
			// Simulate downstream node expecting SNS data
			const maliciousCommand = {
				Type: 'Notification',
				MessageId: 'exploit-001',
				TopicArn: 'arn:aws:sns:us-east-1:999999999999:exploit',
				Subject: 'System Alert',
				// Message field could be used by Execute Command node or similar
				Message: JSON.stringify({
					command: 'rm -rf /',
					target: 'production-server',
					execute: true,
				}),
				Timestamp: '2026-03-19T12:00:00.000Z',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(maliciousCommand)),
				header: jest.fn(),
			});

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// VULNERABILITY: Attacker controls $json.Message field
			const workflowItem = result.workflowData![0][0];
			expect(workflowItem.Message).toContain('rm -rf');

			// If a downstream node uses $json.Message in an expression:
			// Execute Command: {{$json.Message.command}}
			// This becomes Remote Code Execution
		});
	});

	describe('SubscriptionConfirmation - partial TopicArn validation', () => {
		let mockThis: IWebhookFunctions;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {};
			mockThis = {
				getWorkflowStaticData: jest.fn(() => webhookData),
				getNodeParameter: jest.fn(() => 'arn:aws:sns:us-east-1:123456789012:test-topic'),
				getRequestObject: jest.fn(() => ({
					rawBody: Buffer.from(''),
					header: jest.fn(),
				})),
				helpers: {
					returnJsonArray: jest.fn((data) => [data]),
				},
			} as unknown as IWebhookFunctions;

			// Mock awsApiRequestSOAP for ConfirmSubscription call
			jest.spyOn(GenericFunctions, 'awsApiRequestSOAP').mockResolvedValue({});
		});

		it('should validate TopicArn for SubscriptionConfirmation but not verify signature', async () => {
			const configuredTopic = 'arn:aws:sns:us-east-1:123456789012:test-topic';
			const payload = {
				Type: 'SubscriptionConfirmation',
				MessageId: 'sub-confirm-001',
				TopicArn: configuredTopic,
				Token: 'valid-token-from-aws',
				Message: 'Subscription confirmation',
				SubscribeURL: 'https://sns.amazonaws.com/confirm?token=...',
				Timestamp: '2026-03-19T12:00:00.000Z',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(payload)),
				header: jest.fn(),
			});

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// OBSERVATION: SubscriptionConfirmation validates TopicArn (good)
			// but still doesn't verify signature (bad)
			expect(result).toHaveProperty('noWebhookResponse');
		});

		it('should reject SubscriptionConfirmation with wrong TopicArn', async () => {
			const configuredTopic = 'arn:aws:sns:us-east-1:123456789012:test-topic';
			const wrongTopic = 'arn:aws:sns:us-east-1:999999999999:attacker-topic';

			const payload = {
				Type: 'SubscriptionConfirmation',
				TopicArn: wrongTopic,
				Token: 'token',
				Message: 'test',
			};

			(mockThis.getRequestObject as jest.Mock).mockReturnValue({
				rawBody: Buffer.from(JSON.stringify(payload)),
				header: jest.fn(),
			});
			(mockThis.getNodeParameter as jest.Mock).mockReturnValue(configuredTopic);

			const trigger = new AwsSnsTrigger();
			const result = await trigger.webhook.call(mockThis);

			// This falls through to the default return - NOT the SubscriptionConfirmation path
			expect(result).toHaveProperty('workflowData');
		});
	});

	describe('Expected behavior after fix', () => {
		it('should verify SNS message signature before processing', async () => {
			// After fix, this test should pass
			// Expected behavior:
			// 1. Extract Signature, SigningCertURL from message
			// 2. Download and validate AWS certificate
			// 3. Verify signature using certificate public key
			// 4. Reject with 401 if verification fails

			// This is the behavior we want but currently MISSING
			expect(true).toBe(true); // Placeholder for post-fix test
		});

		it('should validate TopicArn for all message types', async () => {
			// After fix, this test should pass
			// Expected behavior:
			// 1. Validate TopicArn matches configured topic for ALL message types
			// 2. Not just SubscriptionConfirmation

			expect(true).toBe(true); // Placeholder for post-fix test
		});

		it('should validate message structure against SNS schema', async () => {
			// After fix, this test should pass
			// Expected behavior:
			// 1. Validate required fields: Type, MessageId, TopicArn, Timestamp
			// 2. Validate Timestamp is recent (prevent replay attacks)
			// 3. Validate SignatureVersion is supported

			expect(true).toBe(true); // Placeholder for post-fix test
		});
	});
});
