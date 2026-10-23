// Regression: a prompt gets a reply in a new thread.
export default async function (t) {
	await t.step('Open the Assistant', () => t.goto());
	await t.step('Send a short prompt', () =>
		t.send('Reply with exactly the word OK and nothing else.'),
	);
	await t.step('Wait until the run ends', () => t.waitForIdle({ timeout: 180_000 }));
	await t.check('The user message shows', () =>
		t.expect(t.ai.userMessages().first()).toBeVisible(),
	);
	await t.check('The reply says OK', () =>
		t.expect(t.ai.assistantMessages().last()).toContainText('OK'),
	);
	await t.check('The composer is ready for the next message', () =>
		t.expect(t.ai.sendButton()).toBeVisible(),
	);
}
