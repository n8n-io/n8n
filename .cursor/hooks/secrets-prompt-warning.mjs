#!/usr/bin/env node

/**
 * Non-blocking secret scanner for beforeSubmitPrompt.
 *
 * Cursor cannot show an in-chat warning without blocking (user_message requires
 * continue: false). This hook allows the prompt through and surfaces a desktop
 * notification instead. Set CURSOR_SECRETS_HOOK_BLOCK=1 to restore blocking.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
	detectSecret,
	readPromptPayload,
} from './lib/secret-detection.mjs';

const WARNING_MESSAGE =
	'Possible secret in your Cursor prompt. Remove the raw value or use a placeholder like <API_KEY>.';

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

function showDesktopWarning(detail) {
	const message = detail ? `${WARNING_MESSAGE} (${detail})` : WARNING_MESSAGE;

	try {
		if (process.platform === 'darwin') {
			const script = `display notification ${JSON.stringify(message)} with title "Cursor" subtitle "Secret scan" sound name "Basso"`;
			spawn('osascript', ['-e', script], {
				detached: true,
				stdio: 'ignore',
			}).unref();
			return;
		}

		if (process.platform === 'linux' && process.env.DISPLAY) {
			spawn('notify-send', ['Cursor — secret scan', message], {
				detached: true,
				stdio: 'ignore',
			}).unref();
		}
	} catch {
		// Notifications must never block prompt submission.
	}
}

function allowPrompt() {
	process.stdout.write(JSON.stringify({ continue: true }));
}

function blockPrompt(message) {
	process.stdout.write(
		JSON.stringify({
			continue: false,
			user_message: message,
		}),
	);
}

async function main() {
	const { payload, texts } = await readPromptPayload();
	const useBlockingMode = process.env.CURSOR_SECRETS_HOOK_BLOCK === '1';

	for (const text of texts) {
		const match = detectSecret(text);

		if (match) {
			writeSecurityLog(match, payload);

			if (useBlockingMode) {
				blockPrompt(
					`Possible secret detected (${match.label}). Your prompt was not sent. Remove the raw value, use a placeholder like <API_KEY>, or load it from your environment, then submit again.`,
				);
				return;
			}

			showDesktopWarning(match.label);
			allowPrompt();
			return;
		}
	}

	allowPrompt();
}

main().catch(() => {
	allowPrompt();
});
