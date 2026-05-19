#!/usr/bin/env node

/**
 * Example warn-only secret scanner for beforeSubmitPrompt.
 *
 * Shows a user_message when a likely secret is detected but always allows the
 * prompt through (continue: true). Swap this in for secrets-prompt-guard.mjs in
 * hooks.json if you want warnings without blocking.
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

function allowPrompt(userMessage) {
	const response = { continue: true };

	if (userMessage) {
		response.user_message = userMessage;
	}

	process.stdout.write(JSON.stringify(response));
}

async function main() {
	const { payload, texts } = await readPromptPayload();

	for (const text of texts) {
		const match = detectSecret(text);

		if (match) {
			writeSecurityLog(match, payload);
			allowPrompt(
				`Possible secret detected (${match.label}). Remove the raw value, use a placeholder like <API_KEY>, or load it from your environment. This hook warns only and did not block your prompt.`,
			);
			return;
		}
	}

	allowPrompt();
}

main().catch(() => {
	allowPrompt();
});
