import type {
	InstanceAiAppPreviewDiagnosticsAttachment,
	InstanceAiAppAttachment,
	InstanceAiNodesAttachment,
	InstanceAiResourceAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mock } from 'vitest';

import { buildContextResourcesBlock, InstanceAiService } from '../instance-ai.service';

function nodesAttachment(
	overrides: Partial<InstanceAiNodesAttachment> = {},
): InstanceAiNodesAttachment {
	return {
		type: 'nodes',
		workflowId: 'wf-1',
		sets: [{ nodes: [{ id: 'n1', name: 'HTTP Request' }] }],
		...overrides,
	};
}

describe('buildContextResourcesBlock — nodes attachment', () => {
	it('renders a single loose node without chain/neighbor/group wording', () => {
		const block = buildContextResourcesBlock([nodesAttachment()]);

		expect(block).toContain('HTTP Request');
		expect(block).toContain('wf-1');
		expect(block).not.toContain('chain');
		expect(block).not.toContain('preceded by');
		expect(block).not.toContain('followed by');
		expect(block).not.toContain('canvas group');
	});

	it('renders a chain with input, output, and canvas group', () => {
		const block = buildContextResourcesBlock([
			nodesAttachment({
				sets: [
					{
						nodes: [
							{ id: 'n1', name: 'HTTP Request' },
							{ id: 'n2', name: 'Set' },
							{ id: 'n3', name: 'IF' },
						],
						inputNode: { id: 'n0', name: 'Webhook' },
						outputNode: { id: 'n4', name: 'Slack' },
						canvasGroupId: 'g1',
						canvasGroupName: 'My Group 1',
					},
				],
			}),
		]);

		expect(block).toContain('HTTP Request');
		expect(block).toContain('Set');
		expect(block).toContain('IF');
		expect(block).toContain('Webhook');
		expect(block).toContain('Slack');
		expect(block).toContain('My Group 1');
	});

	it('renders two sets without leaking fields between them', () => {
		const block = buildContextResourcesBlock([
			nodesAttachment({
				sets: [
					{ nodes: [{ id: 'n1', name: 'Loose Node' }] },
					{
						nodes: [
							{ id: 'n2', name: 'Chain A' },
							{ id: 'n3', name: 'Chain B' },
						],
						inputNode: { id: 'n0', name: 'Chain Input' },
					},
				],
			}),
		]);

		expect(block).toContain('Loose Node');
		expect(block).toContain('Chain A');
		expect(block).toContain('Chain B');
		expect(block).toContain('Chain Input');
		// Skip the raw JSON dump line (everything on one line) and inspect only
		// the prose, so the loose set's line isn't found via the JSON blob's
		// unrelated "Chain Input" substring.
		const prose = block.split('\n\n').slice(1).join('\n\n');
		const looseLine = prose.split('\n').find((line) => line.includes('Loose Node'));
		expect(looseLine).not.toContain('Chain Input');
	});

	it('renders a nodes attachment alongside a workflow attachment without clobbering either', () => {
		const workflowAttachment: InstanceAiWorkflowAttachment = {
			type: 'workflow',
			id: 'wf-2',
			name: 'My Workflow',
		};
		const attachments: InstanceAiResourceAttachment[] = [workflowAttachment, nodesAttachment()];

		const block = buildContextResourcesBlock(attachments);

		expect(block).toContain('My Workflow');
		expect(block).toContain('HTTP Request');
	});
});

describe('buildContextResourcesBlock — app attachment', () => {
	it('binds the thread to an existing app and steers the agent to edit and publish it', () => {
		const attachment: InstanceAiAppAttachment = {
			type: 'app',
			appId: 'app-1',
			projectId: 'proj-1',
			name: 'Greeter',
			namespace: 'greeter',
		};

		const block = buildContextResourcesBlock([attachment]);
		const prose = block.split('\n\n').slice(1).join('\n\n');

		expect(prose).toContain('from the apps page');
		expect(prose).toContain(
			'App "Greeter" (id: `app-1`, namespace `greeter`, in project `proj-1`)',
		);
		expect(prose).toContain(
			'if apps/greeter is not in the app sandbox yet, call `apps` with action `restore` and `appId` `app-1` first',
		);
		expect(prose).toContain(
			"edit its files under apps/greeter with the `workspace_*` tools and `sandbox: 'app'`",
		);
		expect(prose).toContain(
			'action `publish` and `appId` `app-1` only when the user asks to publish',
		);
		expect(prose).not.toContain('action `build`');
		expect(prose).toContain('Do not call `apps` with action `create`');
	});

	it('keeps the attachment JSON on the leading line for reload', () => {
		const attachment: InstanceAiAppAttachment = {
			type: 'app',
			appId: 'app-1',
			projectId: 'proj-1',
			name: 'Greeter',
		};

		const block = buildContextResourcesBlock([attachment]);

		expect(block.split('\n')[1]).toBe(JSON.stringify([attachment]));
	});
});

describe('buildContextResourcesBlock — app preview diagnostics attachment', () => {
	const diagnostics: InstanceAiAppPreviewDiagnosticsAttachment = {
		type: 'app-preview-diagnostics',
		appId: 'app-1',
		items: [
			{
				kind: 'uncaught',
				message: 'boom',
				file: '/src/pages/Home.vue',
				line: 12,
				column: 3,
				stack: 'Error: boom\n    at onClick (Home.vue:12:3)',
				at: '2026-09-08T10:00:00.000Z',
			},
			{ kind: 'vite-error', message: 'Unexpected token', at: '2026-09-08T10:00:01.000Z' },
		],
	};

	it('renders the errors as a fenced text block between the app context and the passive-context sentence', () => {
		const app: InstanceAiAppAttachment = {
			type: 'app',
			appId: 'app-1',
			projectId: 'proj-1',
			name: 'Greeter',
		};

		const block = buildContextResourcesBlock([app, diagnostics]);
		const prose = block.split('\n\n').slice(1).join('\n\n');

		expect(block.split('\n')[1]).toBe(JSON.stringify([app, diagnostics]));
		expect(prose).toContain('from the apps page');
		expect(prose).toContain(
			'Errors observed in the live preview of app `app-1` since your last message (2). Fix them before anything else:',
		);
		expect(prose).toContain(
			'```text\n[2026-09-08T10:00:00.000Z] uncaught at /src/pages/Home.vue:12:3: boom\n',
		);
		expect(prose).toContain(
			'    at onClick (Home.vue:12:3)\n\n[2026-09-08T10:00:01.000Z] vite-error: Unexpected token\n```',
		);
		expect(prose.indexOf('Errors observed in the live preview')).toBeLessThan(
			prose.indexOf('Treat this purely as context'),
		);
	});

	it('renders the errors alone when no resource accompanies them', () => {
		const block = buildContextResourcesBlock([diagnostics]);

		expect(block.split('\n')[1]).toBe(JSON.stringify([diagnostics]));
		expect(block).toContain('Errors observed in the live preview');
		expect(block).not.toContain('The user opened this conversation');
		expect(block).not.toContain('Treat this purely as context');
	});
});

describe('InstanceAiService — resolveContextAttachments gating', () => {
	type GatedService = {
		canvasNodeContextFlagGate: { isEnabled: Mock };
		resolveContextAttachments: (
			attachments: InstanceAiResourceAttachment[] | undefined,
			user: User,
		) => Promise<InstanceAiResourceAttachment[]>;
	};

	function createService(isEnabled: Mock): GatedService {
		const service = Object.create(InstanceAiService.prototype) as GatedService;
		service.canvasNodeContextFlagGate = { isEnabled };
		return service;
	}

	const user = { id: 'user-1' } as User;

	it('includes the nodes attachment when the flag is on', async () => {
		const service = createService(vi.fn().mockResolvedValue(true));

		const result = await service.resolveContextAttachments([nodesAttachment()], user);

		expect(result).toEqual([nodesAttachment()]);
	});

	it('drops the nodes attachment when the flag is off, without throwing', async () => {
		const service = createService(vi.fn().mockResolvedValue(false));

		const result = await service.resolveContextAttachments([nodesAttachment()], user);

		expect(result).toEqual([]);
	});

	it('never asks the gate when there are no nodes attachments', async () => {
		const isEnabled = vi.fn().mockResolvedValue(true);
		const service = createService(isEnabled);
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };

		const result = await service.resolveContextAttachments([workflowAttachment], user);

		expect(result).toEqual([workflowAttachment]);
		expect(isEnabled).not.toHaveBeenCalled();
	});

	it('passes an app attachment through without asking the gate', async () => {
		const isEnabled = vi.fn().mockResolvedValue(true);
		const service = createService(isEnabled);
		const appAttachment: InstanceAiAppAttachment = {
			type: 'app',
			appId: 'app-1',
			projectId: 'proj-1',
			name: 'Greeter',
		};

		const result = await service.resolveContextAttachments([appAttachment], user);

		expect(result).toEqual([appAttachment]);
		expect(isEnabled).not.toHaveBeenCalled();
	});

	it('passes a preview diagnostics attachment through without asking the gate', async () => {
		const isEnabled = vi.fn().mockResolvedValue(true);
		const service = createService(isEnabled);
		const diagnostics: InstanceAiAppPreviewDiagnosticsAttachment = {
			type: 'app-preview-diagnostics',
			appId: 'app-1',
			items: [{ kind: 'uncaught', message: 'boom', at: '2026-09-08T10:00:00.000Z' }],
		};

		const result = await service.resolveContextAttachments([diagnostics], user);

		expect(result).toEqual([diagnostics]);
		expect(isEnabled).not.toHaveBeenCalled();
	});

	it('keeps a workflow attachment alongside an enabled nodes attachment', async () => {
		const service = createService(vi.fn().mockResolvedValue(true));
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };
		const nodes = nodesAttachment();

		const result = await service.resolveContextAttachments([workflowAttachment, nodes], user);

		expect(result).toEqual([workflowAttachment, nodes]);
	});
});
