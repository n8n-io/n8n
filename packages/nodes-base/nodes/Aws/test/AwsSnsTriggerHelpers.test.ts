import { createSign, createVerify, generateKeyPairSync, X509Certificate } from 'crypto';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { IWebhookFunctions } from 'n8n-workflow';

import {
	type AwsSnsMessage,
	clearCertificateCache,
	verifySignature,
} from '../AwsSnsTriggerHelpers';
import type { Mock } from 'vitest';
import type * as _importType0 from 'crypto';

vi.mock('crypto', async () => ({
	...(await vi.importActual<typeof _importType0>('crypto')),
	createVerify: vi.fn(),
	X509Certificate: vi.fn(function () {
		return {
			publicKey: 'public-key',
			validFrom: 'Jan 1 2020 GMT',
			validTo: 'Jan 1 2100 GMT',
		};
	}),
}));

describe('AwsSnsTriggerHelpers', () => {
	const topicArn = 'arn:aws:sns:us-east-1:123456789012:MyTopic';
	const signingCertUrl =
		'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-1234567890abcdef1234567890abcdef.pem';
	const certificate = '-----BEGIN CERTIFICATE-----\ncertificate\n-----END CERTIFICATE-----';
	const signature = 'c2lnbmF0dXJl';
	const notification: AwsSnsMessage = {
		Type: 'Notification',
		Message: 'Hello world!',
		MessageId: '22b80b92-fdea-4c2c-8f9d-bdfb0c7bf324',
		TopicArn: topicArn,
		Subject: 'My First Message',
		Timestamp: '2012-05-02T00:54:06.655Z',
		SignatureVersion: '2',
		Signature: signature,
		SigningCertURL: signingCertUrl,
	};

	let mockWebhookFunctions: IWebhookFunctions;
	let update: Mock;
	let end: Mock;
	let verify: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		clearCertificateCache();

		update = vi.fn().mockReturnThis();
		end = vi.fn();
		verify = vi.fn().mockReturnValue(true);
		(createVerify as Mock).mockReturnValue({ update, end, verify });

		mockWebhookFunctions = {
			helpers: {
				httpRequest: vi.fn().mockResolvedValue(certificate),
			},
		} as unknown as IWebhookFunctions;
	});

	it('returns true when the signature is valid', async () => {
		const result = await verifySignature.call(mockWebhookFunctions, notification, topicArn);

		expect(result).toBe(true);
		expect(mockWebhookFunctions.helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: signingCertUrl,
			disableFollowRedirect: true,
			encoding: 'text',
			json: false,
		});
		expect(X509Certificate).toHaveBeenCalledWith(certificate);
		expect(createVerify).toHaveBeenCalledWith('RSA-SHA256');
		const expectedStringToSign =
			`Message\n${notification.Message}\n` +
			`MessageId\n${notification.MessageId}\n` +
			`Subject\n${notification.Subject}\n` +
			`Timestamp\n${notification.Timestamp}\n` +
			`TopicArn\n${notification.TopicArn}\n` +
			`Type\n${notification.Type}\n`;
		expect(update).toHaveBeenCalledWith(expectedStringToSign, 'utf8');
		expect(end).toHaveBeenCalled();
		expect(verify).toHaveBeenCalledWith('public-key', Buffer.from(signature, 'base64'));
	});

	it('returns false when the signature is invalid', async () => {
		verify.mockReturnValue(false);

		const result = await verifySignature.call(mockWebhookFunctions, notification, topicArn);

		expect(result).toBe(false);
	});

	it('returns false when signature fields are missing', async () => {
		const result = await verifySignature.call(
			mockWebhookFunctions,
			{ ...notification, Signature: undefined },
			topicArn,
		);

		expect(result).toBe(false);
		expect(mockWebhookFunctions.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('returns false when the signing certificate URL is not from SNS', async () => {
		const result = await verifySignature.call(
			mockWebhookFunctions,
			{ ...notification, SigningCertURL: 'https://example.com/cert.pem' },
			topicArn,
		);

		expect(result).toBe(false);
		expect(mockWebhookFunctions.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('returns false when the message topic does not match the node topic', async () => {
		const result = await verifySignature.call(
			mockWebhookFunctions,
			{
				...notification,
				TopicArn: 'arn:aws:sns:us-east-1:123456789012:OtherTopic',
			},
			topicArn,
		);

		expect(result).toBe(false);
		expect(mockWebhookFunctions.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('returns false for unsupported SignatureVersion without downloading the certificate', async () => {
		const result = await verifySignature.call(
			mockWebhookFunctions,
			{ ...notification, SignatureVersion: '99' },
			topicArn,
		);

		expect(result).toBe(false);
		expect(mockWebhookFunctions.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('uses SHA1 for signature version 1', async () => {
		const result = await verifySignature.call(
			mockWebhookFunctions,
			{ ...notification, SignatureVersion: '1' },
			topicArn,
		);

		expect(result).toBe(true);
		expect(createVerify).toHaveBeenCalledWith('RSA-SHA1');
	});

	it('omits Subject from the string to sign when it is not present', async () => {
		const { Subject: _, ...message } = notification;

		await verifySignature.call(mockWebhookFunctions, message as AwsSnsMessage, topicArn);

		const expectedStringToSign =
			`Message\n${message.Message}\n` +
			`MessageId\n${message.MessageId}\n` +
			`Timestamp\n${message.Timestamp}\n` +
			`TopicArn\n${message.TopicArn}\n` +
			`Type\n${message.Type}\n`;
		expect(update).toHaveBeenCalledWith(expectedStringToSign, 'utf8');
	});

	it('caches the certificate and does not download it again on the second call', async () => {
		await verifySignature.call(mockWebhookFunctions, notification, topicArn);
		await verifySignature.call(mockWebhookFunctions, notification, topicArn);

		expect(mockWebhookFunctions.helpers.httpRequest).toHaveBeenCalledTimes(1);
	});

	it('includes Token in the string to sign for UnsubscribeConfirmation', async () => {
		const message: AwsSnsMessage = {
			Type: 'UnsubscribeConfirmation',
			Message: 'You have chosen to deactivate subscription.',
			MessageId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
			SubscribeURL:
				'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-east-1:123456789012:MyTopic&Token=abc123',
			Timestamp: '2012-05-02T00:54:06.655Z',
			Token: 'abc123',
			TopicArn: topicArn,
			SignatureVersion: '2',
			Signature: signature,
			SigningCertURL: signingCertUrl,
		};

		await verifySignature.call(mockWebhookFunctions, message, topicArn);

		const expectedStringToSign =
			`Message\n${message.Message}\n` +
			`MessageId\n${message.MessageId}\n` +
			`SubscribeURL\n${message.SubscribeURL}\n` +
			`Timestamp\n${message.Timestamp}\n` +
			`Token\n${message.Token}\n` +
			`TopicArn\n${message.TopicArn}\n` +
			`Type\n${message.Type}\n`;
		expect(update).toHaveBeenCalledWith(expectedStringToSign, 'utf8');
	});
});

describe('AwsSnsTriggerHelpers - integration with real crypto', () => {
	const topicArn = 'arn:aws:sns:us-east-1:123456789012:MyTopic';
	const signingCertUrl =
		'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-integration.pem';

	const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

	let certPem: string;
	let tmpDir: string;

	beforeAll(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'sns-test-'));
		const keyPath = join(tmpDir, 'key.pem');
		const certPath = join(tmpDir, 'cert.pem');
		const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

		writeFileSync(keyPath, keyPem);
		execFileSync('openssl', [
			'req',
			'-new',
			'-x509',
			'-key',
			keyPath,
			'-out',
			certPath,
			'-days',
			'1',
			'-subj',
			'/CN=sns-test',
		]);
		certPem = readFileSync(certPath, 'utf8');
	});

	afterAll(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	function signMessage(message: AwsSnsMessage, algorithm: string): string {
		const keys: string[] =
			message.Type === 'SubscriptionConfirmation' || message.Type === 'UnsubscribeConfirmation'
				? ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
				: ['Message', 'MessageId', 'Subject', 'SubscribeURL', 'Timestamp', 'TopicArn', 'Type'];

		let stringToSign = '';
		for (const key of keys) {
			if (key in message) {
				stringToSign += key + '\n' + String(message[key as keyof AwsSnsMessage]) + '\n';
			}
		}

		const signer = createSign(algorithm);
		signer.update(stringToSign, 'utf8');
		signer.end();
		return signer.sign(privateKey, 'base64');
	}

	function buildMockWebhookFunctions(certPem: string): IWebhookFunctions {
		return {
			helpers: {
				httpRequest: vi.fn().mockResolvedValue(certPem),
			},
		} as unknown as IWebhookFunctions;
	}

	beforeEach(async () => {
		vi.restoreAllMocks();
		clearCertificateCache();

		const realCrypto = await vi.importActual<typeof _importType0>('crypto');
		(createVerify as Mock).mockImplementation(realCrypto.createVerify);
		(X509Certificate as unknown as Mock).mockImplementation(function (pem: string) {
			return new realCrypto.X509Certificate(pem);
		});
	});

	it('verifies a correctly signed Notification using real RSA', async () => {
		const message: AwsSnsMessage = {
			Type: 'Notification',
			Message: 'Integration test message',
			MessageId: 'int-test-001',
			Subject: 'Test Subject',
			TopicArn: topicArn,
			Timestamp: '2024-01-01T00:00:00.000Z',
			SignatureVersion: '2',
			Signature: '',
			SigningCertURL: signingCertUrl,
		};
		message.Signature = signMessage(message, 'RSA-SHA256');

		const mock = buildMockWebhookFunctions(certPem);
		const result = await verifySignature.call(mock, message, topicArn);

		expect(result).toBe(true);
	});

	it('rejects a tampered message using real RSA', async () => {
		const message: AwsSnsMessage = {
			Type: 'Notification',
			Message: 'Original message',
			MessageId: 'int-test-002',
			TopicArn: topicArn,
			Timestamp: '2024-01-01T00:00:00.000Z',
			SignatureVersion: '2',
			Signature: '',
			SigningCertURL: signingCertUrl,
		};
		message.Signature = signMessage(message, 'RSA-SHA256');
		message.Message = 'Tampered message';

		const mock = buildMockWebhookFunctions(certPem);
		const result = await verifySignature.call(mock, message, topicArn);

		expect(result).toBe(false);
	});

	it('verifies a SubscriptionConfirmation with real RSA-SHA1', async () => {
		const message: AwsSnsMessage = {
			Type: 'SubscriptionConfirmation',
			Message: 'You have chosen to subscribe.',
			MessageId: 'int-test-003',
			SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
			Timestamp: '2024-01-01T00:00:00.000Z',
			Token: 'test-token-123',
			TopicArn: topicArn,
			SignatureVersion: '1',
			Signature: '',
			SigningCertURL: signingCertUrl,
		};
		message.Signature = signMessage(message, 'RSA-SHA1');

		const mock = buildMockWebhookFunctions(certPem);
		const result = await verifySignature.call(mock, message, topicArn);

		expect(result).toBe(true);
	});
});
