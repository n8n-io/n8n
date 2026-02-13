/**
 * Extended User Management for OmiGroup
 *
 * Provides admin APIs to view user details with department info,
 * activity metrics, and management capabilities beyond n8n's built-in.
 *
 * Note: User CRUD operations are done through n8n's own API.
 * This module adds OmiGroup-specific metadata and views.
 */

import type { Express, Request, Response } from 'express';
import { getOmiDb } from '../../database';
import { verifyOmiAdmin } from '../../middleware/auth-guard';
import type { HookDbCollections } from '../../utils/n8n-db';

let _userRepo: HookDbCollections['User'] | null = null;

/**
 * Initialize with n8n's User repository.
 */
export function initUserManagement(userRepo: HookDbCollections['User']): void {
	_userRepo = userRepo;
}

/**
 * Mount user management admin routes.
 */
export function mountUserManagementRoutes(app: Express): void {
	// GET /omi/admin/users - List all users with extended info
	app.get('/omi/admin/users', verifyOmiAdmin, async (_req: Request, res: Response) => {
		if (!_userRepo) {
			return res.status(500).json({ error: 'User repository not initialized' });
		}

		try {
			// Get all users from n8n
			const users = await _userRepo.find();
			const db = getOmiDb();

			// Enrich with OmiGroup data
			const enriched = users.map((user) => {
				// Department info
				const deptRow = db
					.prepare(`
						SELECT d.id, d.name, dm.role
						FROM omi_department d
						INNER JOIN omi_department_member dm ON d.id = dm.department_id
						WHERE dm.user_id = ?
					`)
					.all(user.id) as Array<{ id: string; name: string; role: string }>;

				// Execution stats (last 30 days)
				const statsRow = db
					.prepare(`
						SELECT
							COUNT(*) as total_executions,
							MAX(executed_at) as last_execution
						FROM omi_execution_log
						WHERE user_id = ? AND executed_at >= datetime('now', '-30 days')
					`)
					.get(user.id) as {
					total_executions: number;
					last_execution: string | null;
				} | undefined;

				return {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					disabled: user.disabled,
					createdAt: user.createdAt,
					departments: deptRow,
					stats: {
						executionsLast30Days: statsRow?.total_executions ?? 0,
						lastExecution: statsRow?.last_execution ?? null,
					},
				};
			});

			res.json({ users: enriched });
		} catch (err) {
			console.error('[OmiGroup] Error listing users:', err);
			res.status(500).json({ error: 'Failed to list users' });
		}
	});

	// PUT /omi/admin/users/:id/department - Assign user to department
	app.put('/omi/admin/users/:id/department', verifyOmiAdmin, (req: Request, res: Response) => {
		const { departmentId, role } = req.body as {
			departmentId?: string;
			role?: string;
		};

		if (!departmentId) {
			return res.status(400).json({ error: 'departmentId is required' });
		}

		const db = getOmiDb();
		try {
			db.prepare(
				'INSERT OR REPLACE INTO omi_department_member (department_id, user_id, role) VALUES (?, ?, ?)',
			).run(departmentId, req.params.id, role ?? 'member');

			res.json({ success: true });
		} catch (err) {
			console.error('[OmiGroup] Error assigning department:', err);
			res.status(500).json({ error: 'Failed to assign department' });
		}
	});

	// GET /omi/admin/users/inactive - List inactive users
	app.get('/omi/admin/users/inactive', verifyOmiAdmin, async (req: Request, res: Response) => {
		if (!_userRepo) {
			return res.status(500).json({ error: 'User repository not initialized' });
		}

		const days = parseInt((req.query.days as string) ?? '30', 10);
		const db = getOmiDb();

		try {
			const users = await _userRepo.find();

			// Find users with no executions in the specified period
			const inactive = users.filter((user) => {
				const statsRow = db
					.prepare(`
						SELECT COUNT(*) as count
						FROM omi_execution_log
						WHERE user_id = ? AND executed_at >= datetime('now', '-' || ? || ' days')
					`)
					.get(user.id, days) as { count: number } | undefined;

				return (statsRow?.count ?? 0) === 0;
			});

			res.json({
				period: `${days} days`,
				inactiveUsers: inactive.map((u) => ({
					id: u.id,
					email: u.email,
					firstName: u.firstName,
					lastName: u.lastName,
					role: u.role,
					disabled: u.disabled,
				})),
			});
		} catch (err) {
			console.error('[OmiGroup] Error finding inactive users:', err);
			res.status(500).json({ error: 'Failed to find inactive users' });
		}
	});

	console.log('[OmiGroup] User management routes mounted');
}
