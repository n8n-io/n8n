import express from 'express';
import { ClaudeClient } from './claude-client';
import { SessionManager } from './session-manager';
import type { SendMessageRequest, SendMessageResponse, SessionInfo } from './types';

const app = express();
const PORT = process.env.PORT ?? 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const DEFAULT_WORKING_DIR = process.env.WORKING_DIR ?? process.cwd();

// Validate required environment variables
if (!API_KEY) {
	console.error('Error: ANTHROPIC_API_KEY environment variable is required');
	process.exit(1);
}

// Initialize services
const sessionManager = new SessionManager();
const claudeClient = new ClaudeClient(API_KEY);

// Middleware
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/messages
 * Send a message to Claude (creates new session if sessionId not provided)
 */
app.post('/api/messages', async (req, res) => {
	try {
		const { content, sessionId, workingDirectory } = req.body as SendMessageRequest & {
			workingDirectory?: string;
		};

		if (!content) {
			res.status(400).json({ error: 'Message content is required' });
			return;
		}

		// Get or create session
		let session = sessionId ? sessionManager.getSession(sessionId) : null;

		if (!session) {
			// Create new session
			const workingDir = workingDirectory ?? DEFAULT_WORKING_DIR;
			session = sessionManager.createSession(workingDir);
			console.log(`Created new session ${session.id} for working directory: ${workingDir}`);
		} else {
			sessionManager.touchSession(session.id);
		}

		// Send message to Claude
		console.log(`Processing message in session ${session.id}: ${content.substring(0, 100)}...`);
		const result = await claudeClient.sendMessage(session, content);

		const response: SendMessageResponse = {
			sessionId: session.id,
			content: result.content,
			toolResults: result.toolResults.length > 0 ? result.toolResults : undefined,
		};

		res.json(response);
	} catch (error) {
		console.error('Error processing message:', error);
		const err = error as Error;
		res.status(500).json({ error: err.message });
	}
});

/**
 * GET /api/sessions
 * List all active sessions
 */
app.get('/api/sessions', (_req, res) => {
	const sessions: SessionInfo[] = sessionManager.getAllSessions();
	res.json({ sessions });
});

/**
 * GET /api/sessions/:id
 * Get details about a specific session
 */
app.get('/api/sessions/:id', (req, res) => {
	const session = sessionManager.getSession(req.params.id);

	if (!session) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	res.json({
		id: session.id,
		createdAt: session.createdAt,
		lastActivityAt: session.lastActivityAt,
		messageCount: session.messages.length,
		workingDirectory: session.workingDirectory,
		// Optionally include full message history
		messages: session.messages,
	});
});

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
app.delete('/api/sessions/:id', (req, res) => {
	const deleted = sessionManager.deleteSession(req.params.id);

	if (!deleted) {
		res.status(404).json({ error: 'Session not found' });
		return;
	}

	res.json({ success: true });
});

// Cleanup inactive sessions every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_INACTIVE_TIME = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
	const cleaned = sessionManager.cleanupInactiveSessions(MAX_INACTIVE_TIME);
	if (cleaned > 0) {
		console.log(`Cleaned up ${cleaned} inactive sessions`);
	}
}, CLEANUP_INTERVAL);

// Start server
app.listen(PORT, () => {
	console.log(`Claude Server running on http://localhost:${PORT}`);
	console.log(`Default working directory: ${DEFAULT_WORKING_DIR}`);
	console.log('Ready to accept requests!');
});
