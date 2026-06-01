import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { mock } from 'jest-mock-extended';
import { join as pathJoin } from 'path';
import type { Transporter } from 'nodemailer';

import { NodeMailer } from '@/user-management/email/node-mailer';

const templatesDir = pathJoin(__dirname, '../templates');

async function resolveMjmlIncludes(markup: string): Promise<string> {
	const includePattern = /<mj-include\s+path="\.\/([^"]+)"\s*\/>/g;
	let result = markup;
	let match;
	while ((match = includePattern.exec(result)) !== null) {
		const includedContent = await readFile(pathJoin(templatesDir, match[1]), 'utf-8');
		result = result.replace(match[0], includedContent);
		// Reset regex since the string changed
		includePattern.lastIndex = 0;
	}
	return result;
}

async function renderTemplate(
	templateName: string,
	data: Record<string, unknown>,
): Promise<string> {
	const rawMarkup = await readFile(pathJoin(templatesDir, `${templateName}.mjml`), 'utf-8');
	const markup = await resolveMjmlIncludes(rawMarkup);
	const template = Handlebars.compile(markup);
	return template(data);
}

const basePayload = {
	baseUrl: 'https://n8n.example.com',
	domain: 'example.com',
	currentYear: 2026,
};

describe('NodeMailer', () => {
	let nodeMailer: NodeMailer;
	let mockTransport: jest.Mocked<Transporter>;

	beforeEach(() => {
		nodeMailer = new NodeMailer(
			mockInstance(GlobalConfig, {
				userManagement: {
					emails: {
						smtp: {
							host: 'smtp.test.com',
							port: 587,
							secure: false,
							startTLS: true,
							sender: 'noreply@test.com',
							auth: { user: '', pass: '', serviceClient: '', privateKey: '' },
						},
					},
				},
			}),
			mock(),
			mock(),
		);

		mockTransport = mock<Transporter>();
		mockTransport.sendMail.mockResolvedValue({});
		// Replace the private transport with our mock
		Object.defineProperty(nodeMailer, 'transport', { value: mockTransport });
	});

	describe('plain text generation from templates', () => {
		it('should generate plain text from user-invited template', async () => {
			const body = await renderTemplate('user-invited', {
				...basePayload,
				inviteAcceptUrl: 'https://n8n.example.com/invite/abc123',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'You have been invited to n8n',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('Welcome to n8n!');
			expect(sentText).toContain('example.com');
			expect(sentText).toContain('Set up your n8n account (https://n8n.example.com/invite/abc123)');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});

		it('should generate plain text from password-reset-requested template', async () => {
			const body = await renderTemplate('password-reset-requested', {
				...basePayload,
				firstName: 'John',
				passwordResetUrl: 'https://n8n.example.com/reset/abc123',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'n8n password reset',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('Reset your n8n password');
			expect(sentText).toContain('Hi John,');
			expect(sentText).toContain('example.com');
			expect(sentText).toContain('Set a new password (https://n8n.example.com/reset/abc123)');
			expect(sentText).toContain('only valid for 20 minutes');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});

		it('should generate plain text from workflow-shared template', async () => {
			const body = await renderTemplate('workflow-shared', {
				...basePayload,
				workflowName: 'My Workflow',
				workflowUrl: 'https://n8n.example.com/workflow/123',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Sharer has shared an n8n workflow with you',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('A workflow has been shared with you');
			expect(sentText).toContain('"My Workflow"');
			expect(sentText).toContain('Open Workflow (https://n8n.example.com/workflow/123)');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});

		it('should generate plain text from credentials-shared template', async () => {
			const body = await renderTemplate('credentials-shared', {
				...basePayload,
				credentialsName: 'My API Key',
				credentialsListUrl: 'https://n8n.example.com/home/credentials',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Sharer has shared an n8n credential with you',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('A credential has been shared with you');
			expect(sentText).toContain('"My API Key"');
			expect(sentText).toContain('Open credential (https://n8n.example.com/home/credentials)');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});

		it('should generate plain text from project-shared template', async () => {
			const body = await renderTemplate('project-shared', {
				...basePayload,
				projectName: 'My Project',
				role: 'editor',
				projectUrl: 'https://n8n.example.com/projects/123',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Sharer has invited you to a project',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('My Project');
			expect(sentText).toContain('editor');
			expect(sentText).toContain('View project (https://n8n.example.com/projects/123)');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});

		it('should generate plain text from workflow-deactivated template', async () => {
			const body = await renderTemplate('workflow-deactivated', {
				...basePayload,
				workflowName: 'My Workflow',
				workflowUrl: 'https://n8n.example.com/workflow/123',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'n8n has automatically autodeactivated a workflow',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('Workflow automatically deactivated');
			expect(sentText).toContain('"My Workflow"');
			expect(sentText).toContain('View Workflow (https://n8n.example.com/workflow/123)');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});

		it('should generate plain text from workflow-failure template', async () => {
			const body = await renderTemplate('workflow-failure', {
				...basePayload,
				firstName: 'John',
				workflowName: 'My Workflow',
				workflowId: '123',
				workflowUrl: 'https://n8n.example.com/workflow/123',
				instanceURL: 'https://n8n.example.com',
			});

			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: '⚠️ Your workflow failed. Get alerts next time',
				body,
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('Hi John,');
			expect(sentText).toContain('"My Workflow"');
			expect(sentText).toContain(
				'Set up my Error Workflow (https://n8n.example.com/templates/2159)',
			);
			expect(sentText).toContain('Tutorial (https://www.youtube.com/watch?v=bTF3tACqPRU)');
			expect(sentText).toContain('Docs (https://docs.n8n.io/flow-logic/error-handling/)');
			expect(sentText).toContain('Happy automating');
			expect(sentText).toContain('The n8n team');
			expect(sentText).not.toMatch(/<[^>]+>/);
		});
	});

	describe('plain text edge cases', () => {
		it('should use textOnly when provided instead of generating plain text', async () => {
			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Test',
				body: '<p>HTML body</p>',
				textOnly: 'Custom plain text',
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toBe('Custom plain text');
		});

		it('should not generate plain text when body is a Buffer', async () => {
			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Test',
				body: Buffer.from('binary content') as unknown as string,
			});

			expect(mockTransport.sendMail.mock.calls[0][0].text).toBeUndefined();
		});

		it('should decode HTML entities', async () => {
			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Test',
				body: '<p>Tom &amp; Jerry &lt;3 &gt; &quot;friends&quot; &#039;forever&#039;</p>',
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toBe('Tom & Jerry <3 > "friends" \'forever\'');
		});

		it('should collapse multiple blank lines', async () => {
			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Test',
				body: '<p>First</p><p></p><p></p><p></p><p>Second</p>',
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).not.toMatch(/\n{3,}/);
			expect(sentText).toContain('First');
			expect(sentText).toContain('Second');
		});

		it('should strip head, script, and style content', async () => {
			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Test',
				body: '<head><style>body{color:red}</style></head><script>alert("x")</script><body><p>Visible content</p></body>',
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toBe('Visible content');
			expect(sentText).not.toContain('color:red');
			expect(sentText).not.toContain('alert');
		});

		it('should convert br tags to newlines', async () => {
			await nodeMailer.sendMail({
				emailRecipients: 'user@test.com',
				subject: 'Test',
				body: 'Happy automating,<br />The n8n team',
			});

			const sentText = mockTransport.sendMail.mock.calls[0][0].text as string;
			expect(sentText).toContain('Happy automating,\nThe n8n team');
		});
	});
});
