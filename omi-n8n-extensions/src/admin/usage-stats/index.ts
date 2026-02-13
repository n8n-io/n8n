/**
 * Usage Statistics Collection & Reporting
 *
 * Tracks workflow executions per user/department via n8n's
 * external hooks (workflow.postExecute).
 *
 * Data is stored in OmiGroup's separate SQLite database.
 */

import type { Express, Request, Response } from 'express';
import { getOmiDb } from '../../database';
import { verifyOmiAdmin, verifyAuthenticated, getOmiUser } from '../../middleware/auth-guard';

interface ExecutionData {
	userId?: string;
	workflowId: string;
	workflowName?: string;
	executionId: string;
	status: string;
	durationMs?: number;
	nodeCount?: number;
	errorMessage?: string;
}

/**
 * Record a workflow execution.
 * Called from the workflow.postExecute external hook.
 */
export function recordExecution(data: ExecutionData): void {
	try {
		const db = getOmiDb();

		// Look up department for user
		let departmentId: string | null = null;
		if (data.userId) {
			const deptRow = db
				.prepare(
					'SELECT department_id FROM omi_department_member WHERE user_id = ? LIMIT 1',
				)
				.get(data.userId) as { department_id: string } | undefined;
			departmentId = deptRow?.department_id ?? null;
		}

		db.prepare(`
			INSERT INTO omi_execution_log
			(user_id, department_id, workflow_id, workflow_name, execution_id, status, duration_ms, node_count, error_message)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			data.userId ?? null,
			departmentId,
			data.workflowId,
			data.workflowName ?? null,
			data.executionId,
			data.status,
			data.durationMs ?? null,
			data.nodeCount ?? null,
			data.errorMessage ?? null,
		);

		// Update daily stats (upsert)
		const today = new Date().toISOString().split('T')[0];
		const isSuccess = data.status === 'success';

		db.prepare(`
			INSERT INTO omi_daily_stats (date, user_id, department_id, total_executions, success_count, error_count, total_duration_ms)
			VALUES (?, ?, ?, 1, ?, ?, ?)
			ON CONFLICT(date, user_id, department_id) DO UPDATE SET
				total_executions = total_executions + 1,
				success_count = success_count + ?,
				error_count = error_count + ?,
				total_duration_ms = total_duration_ms + ?
		`).run(
			today,
			data.userId ?? '',
			departmentId ?? '',
			isSuccess ? 1 : 0,
			isSuccess ? 0 : 1,
			data.durationMs ?? 0,
			isSuccess ? 1 : 0,
			isSuccess ? 0 : 1,
			data.durationMs ?? 0,
		);
	} catch (err) {
		console.error('[OmiGroup] Failed to record execution:', err);
	}
}

/**
 * Clean up old execution logs based on retention policy.
 */
export function cleanupOldStats(retentionDays: number): void {
	try {
		const db = getOmiDb();
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
		const cutoff = cutoffDate.toISOString();

		db.prepare('DELETE FROM omi_execution_log WHERE executed_at < ?').run(cutoff);
		console.log(`[OmiGroup] Cleaned up execution logs older than ${retentionDays} days`);
	} catch (err) {
		console.error('[OmiGroup] Failed to cleanup old stats:', err);
	}
}

// -----------------------------------------------
// API Routes
// -----------------------------------------------

export function mountUsageStatsRoutes(app: Express): void {
	// GET /omi/admin/stats/overview - Overall stats
	app.get('/omi/admin/stats/overview', verifyOmiAdmin, (_req: Request, res: Response) => {
		const db = getOmiDb();

		const totalUsers = db
			.prepare('SELECT COUNT(DISTINCT user_id) as count FROM omi_execution_log WHERE user_id IS NOT NULL')
			.get() as { count: number };

		const totalExecutions = db
			.prepare('SELECT COUNT(*) as count FROM omi_execution_log')
			.get() as { count: number };

		const last30Days = db
			.prepare(`
				SELECT
					COUNT(*) as total_executions,
					SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
					SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as error_count,
					AVG(duration_ms) as avg_duration_ms
				FROM omi_execution_log
				WHERE executed_at >= datetime('now', '-30 days')
			`)
			.get() as {
			total_executions: number;
			success_count: number;
			error_count: number;
			avg_duration_ms: number;
		};

		const todayStats = db
			.prepare(`
				SELECT
					COUNT(*) as total_executions,
					COUNT(DISTINCT user_id) as active_users,
					COUNT(DISTINCT workflow_id) as active_workflows
				FROM omi_execution_log
				WHERE date(executed_at) = date('now')
			`)
			.get() as { total_executions: number; active_users: number; active_workflows: number };

		res.json({
			totalActiveUsers: totalUsers.count,
			totalExecutions: totalExecutions.count,
			last30Days,
			today: todayStats,
		});
	});

	// GET /omi/admin/stats/departments - Stats by department
	app.get('/omi/admin/stats/departments', verifyOmiAdmin, (req: Request, res: Response) => {
		const days = parseInt((req.query.days as string) ?? '30', 10);
		const db = getOmiDb();

		const stats = db
			.prepare(`
				SELECT
					d.id,
					d.name,
					COALESCE(SUM(ds.total_executions), 0) as total_executions,
					COALESCE(SUM(ds.success_count), 0) as success_count,
					COALESCE(SUM(ds.error_count), 0) as error_count,
					COALESCE(SUM(ds.total_duration_ms), 0) as total_duration_ms,
					COUNT(DISTINCT ds.user_id) as active_users
				FROM omi_department d
				LEFT JOIN omi_daily_stats ds ON d.id = ds.department_id
					AND ds.date >= date('now', '-' || ? || ' days')
				GROUP BY d.id, d.name
				ORDER BY total_executions DESC
			`)
			.all(days) as Array<{
			id: string;
			name: string;
			total_executions: number;
			success_count: number;
			error_count: number;
			total_duration_ms: number;
			active_users: number;
		}>;

		res.json({ period: `${days} days`, departments: stats });
	});

	// GET /omi/admin/stats/users - Stats by user
	app.get('/omi/admin/stats/users', verifyOmiAdmin, (req: Request, res: Response) => {
		const days = parseInt((req.query.days as string) ?? '30', 10);
		const limit = parseInt((req.query.limit as string) ?? '50', 10);
		const db = getOmiDb();

		const stats = db
			.prepare(`
				SELECT
					user_id,
					COUNT(*) as total_executions,
					SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
					SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as error_count,
					AVG(duration_ms) as avg_duration_ms,
					MAX(executed_at) as last_execution
				FROM omi_execution_log
				WHERE executed_at >= datetime('now', '-' || ? || ' days')
					AND user_id IS NOT NULL
				GROUP BY user_id
				ORDER BY total_executions DESC
				LIMIT ?
			`)
			.all(days, limit) as Array<{
			user_id: string;
			total_executions: number;
			success_count: number;
			error_count: number;
			avg_duration_ms: number;
			last_execution: string;
		}>;

		res.json({ period: `${days} days`, users: stats });
	});

	// GET /omi/admin/stats/trends - Daily execution trends
	app.get('/omi/admin/stats/trends', verifyOmiAdmin, (req: Request, res: Response) => {
		const days = parseInt((req.query.days as string) ?? '30', 10);
		const db = getOmiDb();

		const trends = db
			.prepare(`
				SELECT
					date(executed_at) as date,
					COUNT(*) as total_executions,
					SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
					SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as error_count,
					COUNT(DISTINCT user_id) as active_users,
					COUNT(DISTINCT workflow_id) as active_workflows
				FROM omi_execution_log
				WHERE executed_at >= datetime('now', '-' || ? || ' days')
				GROUP BY date(executed_at)
				ORDER BY date ASC
			`)
			.all(days) as Array<{
			date: string;
			total_executions: number;
			success_count: number;
			error_count: number;
			active_users: number;
			active_workflows: number;
		}>;

		res.json({ period: `${days} days`, trends });
	});

	// GET /omi/admin/stats/export - Export stats as CSV
	app.get('/omi/admin/stats/export', verifyOmiAdmin, (req: Request, res: Response) => {
		const days = parseInt((req.query.days as string) ?? '30', 10);
		const db = getOmiDb();

		const rows = db
			.prepare(`
				SELECT
					execution_id, user_id, department_id, workflow_id, workflow_name,
					status, duration_ms, node_count, error_message, executed_at
				FROM omi_execution_log
				WHERE executed_at >= datetime('now', '-' || ? || ' days')
				ORDER BY executed_at DESC
			`)
			.all(days) as Array<Record<string, unknown>>;

		if (rows.length === 0) {
			return res.status(404).json({ error: 'No data found' });
		}

		const headers = Object.keys(rows[0]);
		const csv = [
			headers.join(','),
			...rows.map((row) =>
				headers.map((h) => JSON.stringify(row[h] ?? '')).join(','),
			),
		].join('\n');

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename=omi-stats-${days}d.csv`);
		res.send(csv);
	});

	// GET /omi/my/stats - Current user's stats
	app.get('/omi/my/stats', verifyAuthenticated, (req: Request, res: Response) => {
		const user = getOmiUser(req);
		if (!user) return res.status(401).json({ error: 'Not authenticated' });

		const days = parseInt((req.query.days as string) ?? '30', 10);
		const db = getOmiDb();

		const stats = db
			.prepare(`
				SELECT
					COUNT(*) as total_executions,
					SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
					SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as error_count,
					AVG(duration_ms) as avg_duration_ms
				FROM omi_execution_log
				WHERE user_id = ? AND executed_at >= datetime('now', '-' || ? || ' days')
			`)
			.get(user.id, days) as {
			total_executions: number;
			success_count: number;
			error_count: number;
			avg_duration_ms: number;
		};

		res.json({ period: `${days} days`, stats });
	});

	console.log('[OmiGroup] Usage stats routes mounted');
}
