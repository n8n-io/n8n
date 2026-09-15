import type { AppBlueprint } from '@n8n/api-types';

import { createAppBlueprintTool } from '../app-blueprint.tool';

const BLUEPRINT: AppBlueprint = {
	name: 'Greeter',
	namespace: 'greeter',
	summary: 'Greets visitors by name',
	pages: [{ route: '/', purpose: 'Greeting form' }],
	connections: [{ kind: 'workflow', id: 'wf-1', name: 'Log greeting', key: 'log' }],
	theme: { mode: 'system', primary: '#ff6900', tone: 'tinted' },
};

function createAgentCtx(resumeData?: unknown) {
	const suspend = vi.fn(async (payload: unknown) => await Promise.resolve(payload));
	return { ctx: { resumeData, suspend }, suspend };
}

describe('app-blueprint tool', () => {
	const tool = createAppBlueprintTool();

	it('suspends with the proposal as an app-blueprint card on the first call', async () => {
		const { ctx, suspend } = createAgentCtx();

		await tool.handler!({ blueprint: BLUEPRINT }, ctx as never);

		expect(suspend).toHaveBeenCalledWith({
			requestId: expect.any(String),
			message: 'Review the blueprint for Greeter',
			severity: 'info',
			inputType: 'app-blueprint',
			appBlueprint: BLUEPRINT,
		});
	});

	it('returns the blueprint as the user edited it on approval', async () => {
		const edited = { ...BLUEPRINT, name: 'Hello', namespace: 'hello', connections: [] };
		const { ctx } = createAgentCtx({ approved: true, blueprint: edited });

		const result = await tool.handler!({ blueprint: BLUEPRINT }, ctx as never);

		expect(result).toEqual({ approved: true, blueprint: edited });
	});

	it('falls back to the proposal when the approval carries no edited copy', async () => {
		const { ctx } = createAgentCtx({ approved: true });

		const result = await tool.handler!({ blueprint: BLUEPRINT }, ctx as never);

		expect(result).toEqual({ approved: true, blueprint: BLUEPRINT });
	});

	it('hands the feedback back when the user asks for changes', async () => {
		const { ctx } = createAgentCtx({ approved: false, feedback: 'Add a history page' });

		const result = await tool.handler!({ blueprint: BLUEPRINT }, ctx as never);

		expect(result).toEqual({ approved: false, feedback: 'Add a history page' });
	});
});
