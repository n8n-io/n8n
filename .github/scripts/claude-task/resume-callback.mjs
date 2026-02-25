#!/usr/bin/env node
/**
 * Sends a callback to the resume URL with the Claude task result.
 * Uses fetch() directly to avoid E2BIG errors from shell argument limits.
 *
 * Usage: node resume-callback.mjs
 *
 * Environment variables:
 *   RESUME_URL      - Callback URL to POST to (required)
 *   EXECUTION_FILE  - Path to Claude's execution output JSON (optional)
 *   CLAUDE_OUTCOME  - "success" or "failure" (required)
 *   CLAUDE_SESSION_ID - Session ID for resuming conversations (optional)
 *   BRANCH_NAME     - Git branch name (optional)
 */

import { existsSync, readFileSync } from 'node:fs';

const resumeUrl = process.env.RESUME_URL;
const executionFile = process.env.EXECUTION_FILE;
const claudeOutcome = process.env.CLAUDE_OUTCOME;
const sessionId = process.env.CLAUDE_SESSION_ID ?? '';
const branchName = process.env.BRANCH_NAME ?? '';

if (!resumeUrl) {
	console.error('RESUME_URL environment variable is required');
	process.exit(1);
}

const success = claudeOutcome === 'success';
let result = null;

if (executionFile && existsSync(executionFile)) {
	try {
		const execution = JSON.parse(readFileSync(executionFile, 'utf-8'));
		// Extract the last element (Claude's final result message)
		result = Array.isArray(execution) ? execution.at(-1) : execution;
	} catch (err) {
		console.warn(`Failed to parse execution file: ${err.message}`);
	}
}

const payload = JSON.stringify({ success, branch: branchName, sessionId, result });

try {
	const response = await fetch(resumeUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: payload,
	});

	console.log(`Callback sent: ${response.status} ${response.statusText}`);

	if (!response.ok) {
		const body = await response.text();
		console.error(`Callback failed: ${body}`);
		process.exit(1);
	}
} catch (err) {
	console.error(`Callback error: ${err.message}`);
	process.exit(1);
}
