import {
	InstanceAiConfirmRequestDto,
	type InstanceAiConfirmRequest,
} from '../dto/instance-ai/instance-ai-confirm-request.dto';
import { sharedCardRule, type SharedCard } from '../instance-ai-sharing';

const PROJECT = 'project-1';

const approvalCard = { requestId: 'r-1', message: 'Archive "Invoices"', severity: 'warning' };
const proposalCard = {
	requestId: 'r-2',
	message: 'Want "Digest" to run automatically?',
	severity: 'info',
	offered: { activate: [true, false] },
	automationProposal: { archived: false },
};

const approve: InstanceAiConfirmRequest = { kind: 'approval', approved: true };
const decline: InstanceAiConfirmRequest = { kind: 'approval', approved: false };
const keep: InstanceAiConfirmRequest = { kind: 'capabilityDecision', approved: true };
const turnOn: InstanceAiConfirmRequest = {
	kind: 'capabilityDecision',
	approved: true,
	values: { activate: true },
};

const card = (
	toolName: string,
	input: unknown,
	suspendPayload: unknown = approvalCard,
): SharedCard => ({ toolName, input, suspendPayload });

describe('sharedCardRule', () => {
	describe('tool cards', () => {
		it.each([
			['workflows', 'delete', 'workflow:delete'],
			['workflows', 'unarchive', 'workflow:delete'],
			['workflows', 'unpublish', 'workflow:unpublish'],
			['workflows', 'restore-version', 'workflow:update'],
			['workflows', 'update-version', 'workflow:update'],
			['executions', 'run', 'workflow:execute'],
			['executions', 'run-step', 'workflow:execute'],
		])('%s %s needs %s on the workflow', (toolName, action, scope) => {
			expect(sharedCardRule(card(toolName, { action, workflowId: 'wf-1' }), approve, PROJECT)).toEqual(
				{ scopes: [scope], target: { type: 'workflow', id: 'wf-1' } },
			);
		});

		it('needs the delete scope on the credential to delete it', () => {
			expect(
				sharedCardRule(card('credentials', { action: 'delete', credentialId: 'c-1' }), approve, PROJECT),
			).toEqual({ scopes: ['credential:delete'], target: { type: 'credential', id: 'c-1' } });
		});

		it.each([
			['delete', 'dataTable:delete'],
			['add-column', 'dataTable:update'],
			['delete-column', 'dataTable:update'],
			['rename-column', 'dataTable:update'],
			['insert-rows', 'dataTable:writeRow'],
			['update-rows', 'dataTable:writeRow'],
			['delete-rows', 'dataTable:writeRow'],
		])('data-tables %s needs %s on the table', (action, scope) => {
			expect(
				sharedCardRule(
					card('data-tables', { action, dataTableId: 'dt-1', projectId: 'other' }),
					approve,
					PROJECT,
				),
			).toEqual({ scopes: [scope], target: { type: 'dataTable', id: 'dt-1' } });
		});

		it('creates a data table only in the thread project, whatever project the input names', () => {
			expect(
				sharedCardRule(
					card('data-tables', { action: 'create', name: 'Leads', projectId: 'other' }),
					approve,
					PROJECT,
				),
			).toEqual({ scopes: ['dataTable:create'], target: { type: 'project', id: PROJECT } });
		});

		it.each([
			['create-folder', 'folder:create'],
			['delete-folder', 'folder:delete'],
		])('workspace %s in the thread project needs %s there', (action, scope) => {
			expect(
				sharedCardRule(
					card('workspace', { action, folderId: 'f-1', projectId: PROJECT }),
					approve,
					PROJECT,
				),
			).toEqual({ scopes: [scope], target: { type: 'project', id: PROJECT } });
		});

		it.each([undefined, 'other-project', ''])(
			'keeps a folder card for the owner when the input names project %j',
			(projectId) => {
				expect(
					sharedCardRule(
						card('workspace', { action: 'delete-folder', folderId: 'f-1', projectId }),
						approve,
						PROJECT,
					),
				).toBeUndefined();
			},
		);

		it('uses the same rule for a decline as for an approval', () => {
			expect(
				sharedCardRule(card('workflows', { action: 'delete', workflowId: 'wf-1' }), decline, PROJECT),
			).toEqual({ scopes: ['workflow:delete'], target: { type: 'workflow', id: 'wf-1' } });
		});

		it('keeps "always allow" possible: the answer scope does not change the rule', () => {
			const always: InstanceAiConfirmRequest = { kind: 'approval', approved: true, scope: 'session' };

			expect(
				sharedCardRule(card('executions', { action: 'run', workflowId: 'wf-1' }), always, PROJECT),
			).toEqual({ scopes: ['workflow:execute'], target: { type: 'workflow', id: 'wf-1' } });
		});
	});

	describe('cards for the owner only', () => {
		it.each([
			['publishing, which also publishes sub-workflows', 'workflows', { action: 'publish', workflowId: 'wf-1' }],
			['workflow setup', 'workflows', { action: 'setup', workflowId: 'wf-1' }],
			['a workflow action without a workflow', 'workflows', { action: 'delete' }],
			['a workflow id that is not text', 'workflows', { action: 'delete', workflowId: 7 }],
			['an empty workflow id', 'workflows', { action: 'delete', workflowId: '' }],
			['stopping an execution', 'executions', { action: 'stop', executionId: 'e-1' }],
			['a credential action without a credential', 'credentials', { action: 'delete' }],
			['credential setup', 'credentials', { action: 'setup', credentials: [] }],
			['a data-table action without a table', 'data-tables', { action: 'delete' }],
			['tagging a workflow', 'workspace', { action: 'tag-workflow', workflowId: 'wf-1' }],
			['moving a workflow', 'workspace', { action: 'move-workflow-to-folder', workflowId: 'wf-1' }],
			['a test execution cleanup', 'workspace', { action: 'cleanup-test-executions', workflowId: 'wf-1' }],
			['an action that is an object property name', 'workflows', { action: 'toString', workflowId: 'wf-1' }],
			['an action that is not text', 'workflows', { action: ['delete'], workflowId: 'wf-1' }],
			['a question card', 'ask-user', { questions: [] }],
			['a plan', 'plan', { tasks: [] }],
			['a sub-agent card', 'build-agent', { workflowId: 'wf-1' }],
			['a web fetch', 'research', { action: 'fetch-url', url: 'https://example.com' }],
			['an MCP connection', 'mcp-servers', { action: 'connect' }],
			['an unknown tool', 'deploy_workflow', { workflowId: 'wf-1' }],
			['an object property name as tool', 'constructor', { action: 'delete', workflowId: 'wf-1' }],
		])('%s', (_label, toolName, input) => {
			expect(sharedCardRule(card(toolName, input), approve, PROJECT)).toBeUndefined();
		});

		it.each([null, 'delete', ['delete'], 7])('a tool input of %j', (input) => {
			expect(sharedCardRule(card('workflows', input), approve, PROJECT)).toBeUndefined();
		});

		it.each([
			['a setup card', { ...approvalCard, setupRequests: [] }],
			['a credential card', { ...approvalCard, credentialRequests: [] }],
			['a credential destination card', { ...approvalCard, credentialDestination: {} }],
			['a question card', { ...approvalCard, questions: [] }],
			['a text input card', { ...approvalCard, inputType: 'text' }],
			['a card that names its workflow', { ...approvalCard, workflowId: 'wf-1' }],
			['a capability card', proposalCard],
			['no card', null],
			['a list card', [approvalCard]],
		])('%s, whatever the tool action', (_label, payload) => {
			expect(
				sharedCardRule(card('workflows', { action: 'delete', workflowId: 'wf-1' }, payload), approve, PROJECT),
			).toBeUndefined();
		});

		it.each<[string, InstanceAiConfirmRequest]>([
			['an approval with text', { kind: 'approval', approved: true, userInput: 'Use the sales sheet' }],
			['a decline with text', { kind: 'approval', approved: false, userInput: 'Change step 2' }],
			['a capability decision on a yes-or-no card', keep],
			['a plan denial', { kind: 'planDeny' }],
			['a web domain approval', { kind: 'domainAccessApprove', domainAccessAction: 'allow_once' }],
			['a web domain denial', { kind: 'domainAccessDeny' }],
			['a credential choice', { kind: 'credentialSelection', credentials: { slackApi: 'c-1' } }],
			['a setup', { kind: 'setupWorkflowApply', nodeCredentials: {} }],
			['an MCP connection', { kind: 'mcpConnect', approved: true, connectedSlugs: [] }],
			['a computer resource', { kind: 'resourceDecision', resourceDecision: 'allowOnce' }],
		])('%s to a yes-or-no card', (_label, answer) => {
			expect(
				sharedCardRule(card('workflows', { action: 'delete', workflowId: 'wf-1' }), answer, PROJECT),
			).toBeUndefined();
		});

		it('accepts only approvals and capability decisions, so a new answer kind is for the owner', () => {
			const kinds = InstanceAiConfirmRequestDto.options.map((option) => option.shape.kind.value);
			const answerable = kinds.filter((kind) => {
				const answer = { kind, approved: true } as InstanceAiConfirmRequest;
				return [
					card('workflows', { action: 'delete', workflowId: 'wf-1' }),
					card('propose_automation', { workflowId: 'wf-1' }, proposalCard),
				].some((pending) => sharedCardRule(pending, answer, PROJECT) !== undefined);
			});

			expect(answerable).toEqual(['approval', 'capabilityDecision']);
		});
	});

	describe('automation proposals', () => {
		const proposal = (payload: unknown = proposalCard) =>
			card('propose_automation', { workflowId: 'wf-1', title: 'Digest' }, payload);

		it.each<[string, InstanceAiConfirmRequest, string[]]>([
			['keeping it off', keep, ['workflow:update']],
			['turning it on', turnOn, ['workflow:update', 'workflow:publish']],
			['"not now"', { kind: 'capabilityDecision', approved: false }, ['workflow:update']],
			[
				'"not now" with the on option still chosen',
				{ kind: 'capabilityDecision', approved: false, values: { activate: true } },
				['workflow:update'],
			],
			[
				'an on option that is not true',
				{ kind: 'capabilityDecision', approved: true, values: { activate: 'true' } },
				['workflow:update'],
			],
		])('needs the scopes for %s', (_label, answer, scopes) => {
			expect(sharedCardRule(proposal(), answer, PROJECT)).toEqual({
				scopes,
				target: { type: 'workflow', id: 'wf-1' },
			});
		});

		it('needs the delete scope to keep an archived workflow, which restores it', () => {
			const archived = { ...proposalCard, automationProposal: { archived: true } };

			expect(sharedCardRule(proposal(archived), turnOn, PROJECT)?.scopes).toEqual([
				'workflow:update',
				'workflow:publish',
				'workflow:delete',
			]);
			expect(
				sharedCardRule(proposal(archived), { kind: 'capabilityDecision', approved: false }, PROJECT)
					?.scopes,
			).toEqual(['workflow:update']);
		});

		it.each([
			['no proposal', { ...proposalCard, automationProposal: undefined }],
			['a proposal without the archived flag', { ...proposalCard, automationProposal: {} }],
			['a proposal that is not an object', { ...proposalCard, automationProposal: 'archived' }],
		])('counts a card with %s as archived', (_label, payload) => {
			expect(sharedCardRule(proposal(payload), keep, PROJECT)?.scopes).toEqual([
				'workflow:update',
				'workflow:delete',
			]);
		});

		it('keeps a proposal answered with a plain approval for the owner', () => {
			expect(sharedCardRule(proposal(), approve, PROJECT)).toBeUndefined();
		});

		it('keeps a proposal card without offered options for the owner', () => {
			const { offered: _offered, ...withoutOptions } = proposalCard;

			expect(sharedCardRule(proposal(withoutOptions), keep, PROJECT)).toBeUndefined();
		});

		it('keeps a proposal without a workflow for the owner', () => {
			expect(
				sharedCardRule(card('propose_automation', { title: 'Digest' }, proposalCard), keep, PROJECT),
			).toBeUndefined();
		});
	});

	it('returns a new scope list for each call, so a caller cannot change the rules', () => {
		const pending = card('workflows', { action: 'delete', workflowId: 'wf-1' });
		sharedCardRule(pending, approve, PROJECT)?.scopes.push('workflow:share');

		expect(sharedCardRule(pending, approve, PROJECT)?.scopes).toEqual(['workflow:delete']);
	});
});
