import { LmChatGoogleGemini } from '../LmChatGoogleGemini.node';

describe('LmChatGoogleGemini', () => {
	it('should send every model field to the provider catalog with a Gemini 3.x floor', () => {
		const hints = new LmChatGoogleGemini().description.properties
			.filter((p) => p.name === 'modelName')
			.map((p) => p.builderHint?.propertyHint);

		expect(hints).toHaveLength(3);
		for (const hint of hints) {
			expect(hint).toContain('even with a connected credential');
			expect(hint).toContain('use current Google provider catalog information');
			expect(hint).toContain('Do not choose Gemini 2.x or older');
		}
	});

	it('should not name builder tools in the model hint', () => {
		const hints = new LmChatGoogleGemini().description.properties
			.filter((p) => p.name === 'modelName')
			.map((p) => p.builderHint?.propertyHint);

		for (const hint of hints) {
			expect(hint).not.toMatch(/searchModels|explore-resources|nodes\(/);
		}
	});
});
