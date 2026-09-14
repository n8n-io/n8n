import type {
	InstanceAiAppAttachment,
	InstanceAiResourceAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import type { User } from '@n8n/db';

import { buildContextResourcesBlock, InstanceAiService } from '../instance-ai.service';

function appAttachment(overrides: Partial<InstanceAiAppAttachment> = {}): InstanceAiAppAttachment {
	return {
		type: 'app',
		appId: 'app-1',
		projectId: 'proj-1',
		name: 'Orders dashboard',
		namespace: 'orders-dashboard',
		...overrides,
	};
}

describe('buildContextResourcesBlock — app attachment', () => {
	it('states the thread is bound to the app, by name, id, and public path', () => {
		const block = buildContextResourcesBlock([appAttachment()]);

		expect(block).toContain('This thread is bound to app');
		expect(block).toContain('Orders dashboard');
		expect(block).toContain('app-1');
		expect(block).toContain('/apps/orders-dashboard/');
		expect(block).toContain('do not create another app');
	});

	it('uses the apps-page header, not the workflow-editor or agent-editor one', () => {
		const block = buildContextResourcesBlock([appAttachment()]);

		expect(block).toContain('the apps page');
		expect(block).not.toContain('the workflow editor');
		expect(block).not.toContain('the agent editor');
	});

	it('falls back to the bare id when name and namespace are absent', () => {
		const block = buildContextResourcesBlock([
			appAttachment({ name: undefined, namespace: undefined }),
		]);

		expect(block).toContain('This thread is bound to app `app-1`');
		expect(block).not.toContain('/apps/');
	});

	it('renders alongside a workflow attachment without clobbering either', () => {
		const workflowAttachment: InstanceAiWorkflowAttachment = {
			type: 'workflow',
			id: 'wf-1',
			name: 'My Workflow',
		};

		const block = buildContextResourcesBlock([workflowAttachment, appAttachment()]);

		expect(block).toContain('My Workflow');
		expect(block).toContain('Orders dashboard');
	});
});

describe('InstanceAiService — resolveContextAttachments passes app attachments through', () => {
	type GatedService = {
		canvasNodeContextFlagGate: { isEnabled: (user: User) => Promise<boolean> };
		resolveContextAttachments: (
			attachments: InstanceAiResourceAttachment[] | undefined,
			user: User,
		) => Promise<InstanceAiResourceAttachment[]>;
	};

	function createService(): GatedService {
		return Object.create(InstanceAiService.prototype) as GatedService;
	}

	const user = { id: 'user-1' } as User;

	it('keeps an app attachment (never gated, unlike nodes)', async () => {
		const service = createService();
		const app = appAttachment();

		const result = await service.resolveContextAttachments([app], user);

		expect(result).toEqual([app]);
	});

	it('keeps an app attachment alongside a workflow attachment', async () => {
		const service = createService();
		const workflowAttachment: InstanceAiWorkflowAttachment = { type: 'workflow', id: 'wf-1' };
		const app = appAttachment();

		const result = await service.resolveContextAttachments([workflowAttachment, app], user);

		expect(result).toEqual([workflowAttachment, app]);
	});
});
