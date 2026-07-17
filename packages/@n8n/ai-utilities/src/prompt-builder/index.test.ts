describe('prompt-builder public module', () => {
	it('is available as an AI utilities subpath', async () => {
		const modulePath = './index.js';

		await expect(import(modulePath)).resolves.toMatchObject({
			PromptBuilder: expect.any(Function),
			prompt: expect.any(Function),
		});
	});
});
