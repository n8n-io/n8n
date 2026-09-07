import { getProgressiveBuildingInstructions } from '../../skills/runtime-skills';
import { getSystemPrompt } from '../system-prompt';

describe('progressive building instructions', () => {
	it('leaves the control prompt unchanged', async () => {
		const instructions = await getProgressiveBuildingInstructions(undefined);
		expect(instructions).toBeUndefined();
		expect(getSystemPrompt({ progressiveBuildingInstructions: instructions })).toBe(
			getSystemPrompt(),
		);
	});

	it('includes the policy without a model-driven skill load', async () => {
		const instructions = await getProgressiveBuildingInstructions('progressive');
		expect(instructions).toBeTruthy();
		const prompt = getSystemPrompt({ progressiveBuildingInstructions: instructions });
		expect(prompt).toContain(instructions);
		expect(prompt).toContain('automatic `<workflow-setup-required>`');
		expect(prompt).not.toContain('load `progressive-building`');
	});
});
