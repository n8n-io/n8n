#!/usr/bin/env node

/**
 * Warn-only secret scanner for beforeSubmitPrompt.
 *
 * Cursor only surfaces user_message when continue is false, so this hook
 * soft-blocks: the prompt is not sent until you remove the secret and submit
 * again. See https://cursor.com/docs/hooks#beforesubmitprompt
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
	detectSecret,
	readPromptPayload,
} from './lib/secret-detection.mjs';

function writeSecurityLog(match, payload) {
	const logPath =
		process.env.CURSOR_SECURITY_LOG ||
		path.join(os.tmpdir(), 'cursor-security.log');
	const userEmail = payload.user_email || payload.userEmail || 'unknown';
	const eventName =
		payload.hook_event_name || payload.event || 'beforeSubmitPrompt';
	const timestamp = new Date().toISOString();
	const line = `[${timestamp}] WARNING: ${match.category} detected during ${eventName} from user: ${userEmail}\n`;

	try {
		fs.appendFileSync(logPath, line, { encoding: 'utf8', mode: 0o600 });
	} catch {
		// Logging must never block or expose a prompt by itself.
	}
}

function allowPrompt() {
	process.stdout.write(JSON.stringify({ continue: true }));
}

function warnAndHoldPrompt(message) {
	// Cursor shows user_message only when continue is false.
	process.stdout.write(
		JSON.stringify({
			continue: false,
			user_message: message,
		}),
	);
}

async function main() {
	const { payload, texts } = await readPromptPayload();

	for (const text of texts) {
		const match = detectSecret(text);

		if (match) {
			writeSecurityLog(match, payload);
			warnAndHoldPrompt(
				`Possible secret detected (${match.label}). Your prompt was not sent. Remove the raw value, use a placeholder like <API_KEY>, or load it from your environment, then submit again.`,
			);
			return;
		}
	}

	allowPrompt();
}

main().catch(() => {
	allowPrompt();
});
