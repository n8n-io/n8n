// Visual: a thread with one short exchange, and the composer after the reply.
export default async function (t) {
	await t.step('Open the Assistant', () => t.goto());
	await t.step('Send a short prompt', () =>
		t.send('Reply with exactly the word OK and nothing else.'),
	);
	await t.step('Wait until the run ends', () => t.waitForIdle({ timeout: 180_000 }));
	// The reply text and the thread title come from the LLM. The title also shows in the main sidebar.
	const title = (await t.ai.sidebarToggle().innerText()).trim();
	await t.capture('thread-reply', { mask: [t.ai.assistantMessages()], maskText: [title] });
}
