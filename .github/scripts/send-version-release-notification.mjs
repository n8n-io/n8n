import { ensureEnvVar } from './github-helpers.mjs';

async function sendVersionReleaseNotification() {
	const payload = ensureEnvVar('PAYLOAD');
	const webhookData = ensureEnvVar('N8N_VERSION_RELEASE_NOTIFICATION_DATA');

	const { user, secret, url } = JSON.parse(webhookData);

	console.log('Payload: ', JSON.parse(payload));

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Basic ' + Buffer.from(`${user}:${secret}`).toString('base64'),
		},
		body: payload,
	});

	const status = response.status;
	console.log('Webhook call returned status ' + status);

	if (status !== 200) {
		const body = await response.text();
		throw new Error(`Webhook call failed:\n\n ${body}`);
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	sendVersionReleaseNotification();
}
