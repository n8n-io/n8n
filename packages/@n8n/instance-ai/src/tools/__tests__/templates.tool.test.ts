import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { createTemplatesTool } from '../templates.tool';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeContext(getTemplate: (id: string) => Promise<unknown>): InstanceAiContext {
	return {
		workflowTemplateService: { getTemplate },
	} as unknown as InstanceAiContext;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('templates tool', () => {
	it('returns the template for an id', async () => {
		const tool = createTemplatesTool(
			// eslint-disable-next-line @typescript-eslint/require-await
			makeContext(async (id: string) => ({ available: true, template: { id } })),
		);

		const result = await executeTool(tool, { templateId: '7' });

		expect(result).toEqual({ available: true, template: { id: '7' } });
	});

	it('surfaces unavailable templates', async () => {
		const tool = createTemplatesTool(
			// eslint-disable-next-line @typescript-eslint/require-await
			makeContext(async () => ({ available: false as const })),
		);

		const result = await executeTool(tool, { templateId: '7' });

		expect(result).toEqual({ available: false });
	});
});
