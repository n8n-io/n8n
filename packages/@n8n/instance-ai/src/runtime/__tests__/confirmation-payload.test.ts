import {
	instanceAiApprovalResumeSchema,
	mcpConnectResumeSchema,
	type InstanceAiConfirmRequest,
	type InstanceAiConfirmRequestKind,
} from '@n8n/api-types';
import type { ZodType } from 'zod';

import { domainGatingResumeSchema } from '../../domain-access';
import { credentialsResumeSchema } from '../../tools/credentials.tool';
import { evalsResumeSchema } from '../../tools/evals/evals.tool';
import { gatewayConfirmationResumeSchema } from '../../tools/filesystem/create-tools-from-mcp-server';
import { planResumeSchema } from '../../tools/orchestration/plan.tool';
import { askUserResumeSchema } from '../../tools/shared/ask-user.tool';
import { workflowsResumeSchema } from '../../tools/workflows.tool';
import { buildResumeData, toConfirmationData } from '../confirmation-payload';

describe('buildResumeData', () => {
	it('renames the per-node nodeCredentials map to the credentials field setup tools declare', () => {
		const nodeCredentials = { 'Slack Node': { slackApi: 'cred-1' } };

		const resumeData = buildResumeData({ approved: true, action: 'apply', nodeCredentials });

		// The wire DTO and the setup resume schema name the same concept differently;
		// without this rename the map is stripped and the apply configures nothing.
		expect(resumeData).toEqual({ approved: true, action: 'apply', credentials: nodeCredentials });
	});

	it('passes a flat credentials map through unchanged', () => {
		const credentials = { slackApi: 'cred-1', githubApi: 'cred-2' };

		expect(buildResumeData({ approved: true, credentials })).toEqual({
			approved: true,
			credentials,
		});
	});

	it('omits fields the user did not submit rather than sending undefined', () => {
		expect(buildResumeData({ approved: false })).toEqual({ approved: false });
	});

	it('keeps an empty userInput, which is a submitted value', () => {
		expect(buildResumeData({ approved: true, userInput: '' })).toEqual({
			approved: true,
			userInput: '',
		});
	});
});

/**
 * The drift guard for INS-1095: a resume payload the confirm API accepts must reach
 * the suspended tool *intact*. Resume validation strips keys the tool's `resumeSchema`
 * does not declare, so a field the emitter names differently — or a field added to a
 * confirm kind and nowhere else — is silently dropped at runtime instead of failing here.
 *
 * Each row pairs a frontend-sent payload with every resume schema that can receive it
 * (which UI targets which tool is documented in `instance-ai-confirm-request.dto.test.ts`).
 */
describe('confirmation payload → tool resume schema contract', () => {
	/** Tools that declare the shared approval envelope, so any generic approval card
	 *  (approve, deny, approve-with-comment, always-allow) can target them. */
	const approvalEnvelopeSchemas: Array<[string, ZodType]> = [
		[
			'shared approval envelope (build-workflow, data-tables, workspace, executions)',
			instanceAiApprovalResumeSchema,
		],
		['plan', planResumeSchema],
		['evals', evalsResumeSchema],
	];

	/** Cards rendered by a dedicated component, all of which offer a whole-card
	 *  "do this later" that posts a bare denial. */
	const wizardSchemas: Array<[string, ZodType]> = [
		['workflows (setup wizard)', workflowsResumeSchema],
		['credentials', credentialsResumeSchema],
		['ask-user', askUserResumeSchema],
		['filesystem gateway', gatewayConfirmationResumeSchema],
		['domain gating', domainGatingResumeSchema],
		['mcp-servers', mcpConnectResumeSchema],
	];

	const rows: Array<{
		label: string;
		request: InstanceAiConfirmRequest;
		targets: Array<[string, ZodType]>;
	}> = [
		{
			label: 'approve with a comment and an always-allow grant',
			request: { kind: 'approval', approved: true, userInput: 'rename it first', scope: 'session' },
			targets: approvalEnvelopeSchemas,
		},
		{
			label: 'deny with feedback',
			request: { kind: 'approval', approved: false, userInput: 'please revise step 3' },
			targets: approvalEnvelopeSchemas,
		},
		{
			label: 'whole-card deferral',
			request: { kind: 'approval', approved: false },
			targets: [...approvalEnvelopeSchemas, ...wizardSchemas],
		},
		{
			label: 'plan hard denial',
			request: { kind: 'planDeny' },
			targets: [['plan', planResumeSchema]],
		},
		{
			label: 'questions submission',
			request: {
				kind: 'questions',
				answers: [
					{ questionId: 'q1', selectedOptions: ['opt-a'] },
					{ questionId: 'q2', selectedOptions: ['opt-b', 'opt-c'], customText: 'extra' },
					{ questionId: 'q3', selectedOptions: [], skipped: true },
				],
			},
			targets: [
				['ask-user', askUserResumeSchema],
				['evals', evalsResumeSchema],
			],
		},
		{
			label: 'credential selection',
			request: { kind: 'credentialSelection', credentials: { slackApi: 'cred-1' } },
			targets: [['credentials', credentialsResumeSchema]],
		},
		{
			label: 'credential auto-setup',
			request: { kind: 'credentialAutoSetup', credentialType: 'firecrawlApi', attemptId: 'a-1' },
			targets: [['credentials', credentialsResumeSchema]],
		},
		{
			label: 'credential destination approval',
			request: {
				kind: 'credentialDestination',
				approved: true,
				origin: 'https://api.example.com',
			},
			targets: [['workflows (setup wizard)', workflowsResumeSchema]],
		},
		{
			label: 'domain access approval',
			request: { kind: 'domainAccessApprove', domainAccessAction: 'allow_domain' },
			targets: [['domain gating', domainGatingResumeSchema]],
		},
		{
			label: 'domain access denial',
			request: { kind: 'domainAccessDeny' },
			targets: [['domain gating', domainGatingResumeSchema]],
		},
		{
			label: 'gateway resource decision',
			request: { kind: 'resourceDecision', resourceDecision: 'allowForSession' },
			targets: [['filesystem gateway', gatewayConfirmationResumeSchema]],
		},
		{
			label: 'setup wizard apply with a filled credential slot',
			request: {
				kind: 'setupWorkflowApply',
				nodeCredentials: { 'Slack Node': { slackApi: 'cred-1' } },
				nodeParameters: { 'Slack Node': { channel: '#general' } },
				skippedNodes: ['GitHub Node'],
			},
			targets: [['workflows (setup wizard)', workflowsResumeSchema]],
		},
		{
			label: 'setup wizard test trigger',
			request: {
				kind: 'setupWorkflowTestTrigger',
				testTriggerNode: 'Webhook',
				nodeCredentials: { Webhook: { httpHeaderAuth: 'cred-3' } },
				nodeParameters: { Webhook: { path: '/trigger' } },
			},
			targets: [['workflows (setup wizard)', workflowsResumeSchema]],
		},
		{
			label: 'mcp server connection',
			request: { kind: 'mcpConnect', approved: true, connectedSlugs: ['brave'] },
			targets: [['mcp-servers', mcpConnectResumeSchema]],
		},
	];

	const cases = rows.flatMap(({ label, request, targets }) =>
		targets.map(
			([tool, schema]) =>
				[`${label} → ${tool}`, request, schema] as [string, InstanceAiConfirmRequest, ZodType],
		),
	);

	test.each(cases)('%s', (_label, request, schema) => {
		const resumeData = buildResumeData(toConfirmationData(request));

		const parsed = schema.safeParse(resumeData);

		expect(parsed.success).toBe(true);
		// Equality is the actual assertion: parsing strips undeclared keys, so a
		// schema missing one of the emitted fields shows up as a diff here.
		if (parsed.success) expect(parsed.data).toEqual(resumeData);
	});

	/** Adding a kind to `InstanceAiConfirmRequestDto` fails this `satisfies` until the
	 *  kind gets a row above, i.e. until its resume target is decided. */
	const coveredKinds = {
		approval: true,
		questions: true,
		credentialSelection: true,
		credentialAutoSetup: true,
		credentialDestination: true,
		domainAccessApprove: true,
		domainAccessDeny: true,
		planDeny: true,
		resourceDecision: true,
		setupWorkflowApply: true,
		setupWorkflowTestTrigger: true,
		mcpConnect: true,
	} satisfies Record<InstanceAiConfirmRequestKind, true>;

	it('covers every confirmation kind the API accepts', () => {
		const exercised = new Set(rows.map((row) => row.request.kind));

		expect([...Object.keys(coveredKinds)].sort()).toEqual([...exercised].sort());
	});
});
