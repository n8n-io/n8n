import { isChatHubToolTypeAllowed } from '../chat-hub';

describe('isChatHubToolTypeAllowed', () => {
	it.each(['@n8n/n8n-nodes-langchain.chat', '@n8n/n8n-nodes-langchain.chatHitlTool'])(
		'blocks the %s variant of the Chat tool for all users',
		(type) => {
			expect(isChatHubToolTypeAllowed(type, { isChatUser: false })).toBe(false);
		},
	);

	it.each([
		'n8nNodesBaseSlackTool',
		'n8n-nodes-base.',
		'.slackTool',
		'n8n-nodes-base.slackTool.v2',
		'n8n-nodes-base.slack.Tool',
		'@n8n/n8n-nodes-langchain.toolCode.x',
		'@n8n/n8n-nodes-langchain.toolWorkflow.Tool',
	])('rejects the malformed node type %s for all users', (type) => {
		expect(isChatHubToolTypeAllowed(type, { isChatUser: false })).toBe(false);
		expect(isChatHubToolTypeAllowed(type, { isChatUser: true })).toBe(false);
	});

	it('blocks the Data Table HITL tool for chat users', () => {
		expect(isChatHubToolTypeAllowed('n8n-nodes-base.dataTableHitlTool', { isChatUser: true })).toBe(
			false,
		);
	});

	it('blocks the Chat tool for all users', () => {
		expect(
			isChatHubToolTypeAllowed('@n8n/n8n-nodes-langchain.chatTool', { isChatUser: false }),
		).toBe(false);
		expect(
			isChatHubToolTypeAllowed('@n8n/n8n-nodes-langchain.chatTool', { isChatUser: true }),
		).toBe(false);
	});

	it.each([
		'@n8n/n8n-nodes-langchain.toolWorkflow',
		'n8n-nodes-base.dataTableTool',
		'n8n-nodes-base.executeCommand',
		'n8n-nodes-base.executeCommandTool',
		'n8n-nodes-base.code',
		'@n8n/n8n-nodes-langchain.toolCode',
		'n8n-nodes-base.git',
		'n8n-nodes-base.gitTool',
		'n8n-nodes-base.messageAnAgentTool',
		'n8n-nodes-base.executeCommandHitlTool',
		'n8n-nodes-base.codeHitlTool',
		'n8n-nodes-base.readWriteFileHitlTool',
		'n8n-nodes-base.executeWorkflowHitlTool',
		'n8n-nodes-base.n8nHitlTool',
	])('blocks %s for chat users', (type) => {
		expect(isChatHubToolTypeAllowed(type, { isChatUser: true })).toBe(false);
	});

	it.each(['n8n-nodes-base.executeCommandTool', '@n8n/n8n-nodes-langchain.toolCode'])(
		'allows %s for users who can build workflows',
		(type) => {
			expect(isChatHubToolTypeAllowed(type, { isChatUser: false })).toBe(true);
		},
	);

	it.each([
		'n8n-nodes-base.slackTool',
		'n8n-nodes-base.gmailTool',
		'n8n-nodes-base.httpRequestTool',
		'@n8n/n8n-nodes-langchain.toolHttpRequest',
		'n8n-nodes-base.graphqlTool',
		'n8n-nodes-base.rssFeedReadTool',
		'@n8n/n8n-nodes-langchain.mcpClientTool',
		'n8n-nodes-base.sshTool',
		'n8n-nodes-base.ftpHitlTool',
		'n8n-nodes-base.jenkinsTool',
		'n8n-nodes-base.rundeckTool',
		'n8n-nodes-base.awsLambdaTool',
	])('allows %s for chat users', (type) => {
		expect(isChatHubToolTypeAllowed(type, { isChatUser: true })).toBe(true);
	});
});
