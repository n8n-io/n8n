// Visual: the Assistant home screen, and the chat history popover.
export default async function (t) {
	await t.step('Open the Assistant', () => t.goto());
	await t.capture('assistant-home');
	await t.step('Open the chat history', async () => {
		await t.ai.sidebarToggle().click();
		await t.expect(t.ai.threadList()).toBeVisible();
	});
	// Other visual scenarios create threads at the same time, so the list content changes between runs.
	await t.capture('chat-history', { mask: [t.ai.threadList()] });
}
