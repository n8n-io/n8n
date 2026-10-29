// Feature: the user stops a run while the Assistant works, and can send a new message after it.
export default async function (t) {
	await t.step('Open the Assistant', () => t.goto());
	await t.step('Send a prompt that takes a while', () =>
		t.send(
			'Explain step by step, in at least 30 numbered points, how to design a workflow that syncs ' +
				'contacts between two CRMs. Do not build anything.',
		),
	);
	await t.step('The stop button shows while the run is active', () =>
		t.expect(t.ai.stopButton()).toBeVisible({ timeout: 30_000 }),
	);
	await t.step('Click stop', () => t.ai.stopButton().click());
	await t.check('The stop button goes away', () =>
		t.expect(t.ai.stopButton()).toBeHidden({ timeout: 15_000 }),
	);
	await t.check('The send button comes back', () =>
		t.expect(t.ai.sendButton()).toBeVisible({ timeout: 15_000 }),
	);
	await t.step('Wait until the thread is idle', () => t.waitForIdle({ timeout: 60_000 }));
	await t.check('The thread shows no error message', async () => {
		await t.expect(t.ai.panelText(/something went wrong/i)).toHaveCount(0);
	});
	await t.step('Send a follow-up message', () =>
		t.send('Reply with exactly the word OK and nothing else.'),
	);
	await t.step('Wait for the follow-up reply', () => t.waitForIdle({ timeout: 120_000 }));
	await t.check('The follow-up gets a reply', () =>
		t.expect(t.ai.assistantMessages().last()).toContainText('OK'),
	);
}
