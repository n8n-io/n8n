import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../__tests__/credentials';

const verificationTemplates =
	'<ListCustomVerificationEmailTemplatesResponse><ListCustomVerificationEmailTemplatesResult><CustomVerificationEmailTemplates><member><TemplateName>Welcome</TemplateName></member><member><TemplateName>Reminder</TemplateName></member></CustomVerificationEmailTemplates></ListCustomVerificationEmailTemplatesResult></ListCustomVerificationEmailTemplatesResponse>';
const templates =
	'<ListTemplatesResponse><ListTemplatesResult><TemplatesMetadata><member><Name>Welcome</Name></member><member><Name>Reminder</Name></member></TemplatesMetadata></ListTemplatesResult></ListTemplatesResponse>';
const emptyResponse = (action: string, requestId: string) =>
	`<${action}Response><ResponseMetadata><RequestId>${requestId}</RequestId></ResponseMetadata></${action}Response>`;

describe('AWS SES > Workflows', () => {
	beforeAll(() => {
		nock('https://email.eu-central-1.amazonaws.com')
			.post('/?Action=GetCustomVerificationEmailTemplate&TemplateName=Welcome')
			.reply(
				200,
				'<GetCustomVerificationEmailTemplateResponse><GetCustomVerificationEmailTemplateResult><TemplateName>Welcome</TemplateName></GetCustomVerificationEmailTemplateResult></GetCustomVerificationEmailTemplateResponse>',
			)
			.get('/?Action=ListCustomVerificationEmailTemplates&MaxResults=5')
			.reply(200, verificationTemplates)
			.post('/?Action=ListCustomVerificationEmailTemplates')
			.reply(200, verificationTemplates)
			.post(
				'/?Action=CreateTemplate&Template.TemplateName=Welcome&Template.SubjectPart=Hi%20%7B%7Bname%7D%7D&Template.HtmlPart=%3Cp%3EHi%3C%2Fp%3E',
			)
			.reply(200, emptyResponse('CreateTemplate', 'req-create'))
			.post('/?Action=DeleteTemplate&TemplateName=Old%20Welcome')
			.reply(200, emptyResponse('DeleteTemplate', 'req-delete'))
			.get('/?Action=ListTemplates&MaxItems=3')
			.reply(200, templates)
			.post('/?Action=ListTemplates')
			.reply(200, templates)
			.post(
				'/?Action=UpdateTemplate&Template.TemplateName=Welcome&Template.TextPart=Hi%20there&Template.SubjectPart=Welcome%20back&Template.HtmlPart=%3Cp%3EHi%20there%3C%2Fp%3E',
			)
			.reply(200, emptyResponse('UpdateTemplate', 'req-update'));
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
