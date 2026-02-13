/**
 * Department Management
 *
 * Provides organizational structure on top of n8n's Project system.
 * Each department maps to an n8n Project for workflow/credential sharing.
 *
 * Department data is stored in OmiGroup's separate SQLite database.
 * The n8n_project_id field links to n8n's project for access control.
 */

import type { Express, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getOmiDb } from '../database';
import { verifyOmiAdmin, verifyAuthenticated, getOmiUser } from '../middleware/auth-guard';

export interface Department {
	id: string;
	name: string;
	description: string;
	n8n_project_id: string | null;
	parent_department_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface DepartmentMember {
	id: number;
	department_id: string;
	user_id: string;
	role: string;
	joined_at: string;
}

// -----------------------------------------------
// Core department operations
// -----------------------------------------------

export function getAllDepartments(): Department[] {
	const db = getOmiDb();
	return db.prepare('SELECT * FROM omi_department ORDER BY name').all() as Department[];
}

export function getDepartmentById(id: string): Department | null {
	const db = getOmiDb();
	return (db.prepare('SELECT * FROM omi_department WHERE id = ?').get(id) as Department) ?? null;
}

export function createDepartment(
	name: string,
	description: string = '',
	parentId: string | null = null,
): Department {
	const db = getOmiDb();
	const id = uuid();
	const now = new Date().toISOString();

	db.prepare(`
		INSERT INTO omi_department (id, name, description, parent_department_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`).run(id, name, description, parentId, now, now);

	return getDepartmentById(id)!;
}

export function updateDepartment(
	id: string,
	data: { name?: string; description?: string; n8n_project_id?: string },
): boolean {
	const db = getOmiDb();
	const fields: string[] = [];
	const values: unknown[] = [];

	if (data.name !== undefined) {
		fields.push('name = ?');
		values.push(data.name);
	}
	if (data.description !== undefined) {
		fields.push('description = ?');
		values.push(data.description);
	}
	if (data.n8n_project_id !== undefined) {
		fields.push('n8n_project_id = ?');
		values.push(data.n8n_project_id);
	}

	if (fields.length === 0) return false;

	fields.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(id);

	const result = db
		.prepare(`UPDATE omi_department SET ${fields.join(', ')} WHERE id = ?`)
		.run(...values);
	return (result.changes ?? 0) > 0;
}

export function deleteDepartment(id: string): boolean {
	const db = getOmiDb();
	const result = db.prepare('DELETE FROM omi_department WHERE id = ?').run(id);
	return (result.changes ?? 0) > 0;
}

// -----------------------------------------------
// Department member operations
// -----------------------------------------------

export function getDepartmentMembers(departmentId: string): DepartmentMember[] {
	const db = getOmiDb();
	return db
		.prepare('SELECT * FROM omi_department_member WHERE department_id = ? ORDER BY joined_at')
		.all(departmentId) as DepartmentMember[];
}

export function addUserToDepartment(
	departmentId: string,
	userId: string,
	role: string = 'member',
): boolean {
	const db = getOmiDb();
	try {
		db.prepare(
			'INSERT OR IGNORE INTO omi_department_member (department_id, user_id, role) VALUES (?, ?, ?)',
		).run(departmentId, userId, role);
		return true;
	} catch {
		return false;
	}
}

export function removeUserFromDepartment(departmentId: string, userId: string): boolean {
	const db = getOmiDb();
	const result = db
		.prepare('DELETE FROM omi_department_member WHERE department_id = ? AND user_id = ?')
		.run(departmentId, userId);
	return (result.changes ?? 0) > 0;
}

export function getUserDepartments(userId: string): Department[] {
	const db = getOmiDb();
	return db
		.prepare(`
			SELECT d.* FROM omi_department d
			INNER JOIN omi_department_member dm ON d.id = dm.department_id
			WHERE dm.user_id = ?
			ORDER BY d.name
		`)
		.all(userId) as Department[];
}

/**
 * Auto-detect department for a user based on email pattern.
 * Override this with custom rules as needed.
 *
 * Example rules:
 * - marketing@omigroup.com → Marketing department
 * - sales-* → Sales department
 */
export function getDepartmentByUserEmail(email: string): Department | null {
	// This is a simple implementation. In production, you might want
	// to configure email-to-department mapping in the database.
	const db = getOmiDb();

	try {
		// Check omi_settings for email pattern rules
		const rulesRow = db
			.prepare("SELECT value FROM omi_settings WHERE key = 'department_email_rules'")
			.get() as { value: string } | undefined;

		if (!rulesRow) return null;

		const rules = JSON.parse(rulesRow.value) as Array<{
			pattern: string;
			departmentId: string;
		}>;

		const emailLower = email.toLowerCase();
		for (const rule of rules) {
			if (emailLower.includes(rule.pattern.toLowerCase())) {
				return getDepartmentById(rule.departmentId);
			}
		}
	} catch {
		// No rules configured
	}

	return null;
}

// -----------------------------------------------
// API Routes
// -----------------------------------------------

export function mountDepartmentRoutes(app: Express): void {
	// GET /omi/departments - List all departments
	app.get('/omi/departments', verifyAuthenticated, (_req: Request, res: Response) => {
		res.json({ departments: getAllDepartments() });
	});

	// GET /omi/departments/:id - Get department detail
	app.get('/omi/departments/:id', verifyAuthenticated, (req: Request, res: Response) => {
		const dept = getDepartmentById(req.params.id);
		if (!dept) return res.status(404).json({ error: 'Department not found' });

		const members = getDepartmentMembers(dept.id);
		res.json({ department: dept, members });
	});

	// POST /omi/departments - Create department (admin only)
	app.post('/omi/departments', verifyOmiAdmin, (req: Request, res: Response) => {
		const { name, description, parentId } = req.body as {
			name?: string;
			description?: string;
			parentId?: string;
		};

		if (!name) return res.status(400).json({ error: 'Name is required' });

		const dept = createDepartment(name, description, parentId);
		res.status(201).json({ department: dept });
	});

	// PUT /omi/departments/:id - Update department (admin only)
	app.put('/omi/departments/:id', verifyOmiAdmin, (req: Request, res: Response) => {
		const success = updateDepartment(req.params.id, req.body);
		if (success) {
			const dept = getDepartmentById(req.params.id);
			res.json({ department: dept });
		} else {
			res.status(404).json({ error: 'Department not found or no changes' });
		}
	});

	// DELETE /omi/departments/:id - Delete department (admin only)
	app.delete('/omi/departments/:id', verifyOmiAdmin, (req: Request, res: Response) => {
		const success = deleteDepartment(req.params.id);
		if (success) {
			res.json({ success: true });
		} else {
			res.status(404).json({ error: 'Department not found' });
		}
	});

	// POST /omi/departments/:id/members - Add member (admin only)
	app.post('/omi/departments/:id/members', verifyOmiAdmin, (req: Request, res: Response) => {
		const { userId, role } = req.body as { userId?: string; role?: string };
		if (!userId) return res.status(400).json({ error: 'userId is required' });

		const success = addUserToDepartment(req.params.id, userId, role);
		if (success) {
			res.json({ success: true });
		} else {
			res.status(400).json({ error: 'Failed to add member' });
		}
	});

	// DELETE /omi/departments/:id/members/:userId - Remove member (admin only)
	app.delete(
		'/omi/departments/:id/members/:userId',
		verifyOmiAdmin,
		(req: Request, res: Response) => {
			const success = removeUserFromDepartment(req.params.id, req.params.userId);
			if (success) {
				res.json({ success: true });
			} else {
				res.status(404).json({ error: 'Member not found' });
			}
		},
	);

	// GET /omi/my/departments - Get current user's departments
	app.get('/omi/my/departments', verifyAuthenticated, (req: Request, res: Response) => {
		const user = getOmiUser(req);
		if (!user) return res.status(401).json({ error: 'Not authenticated' });

		const departments = getUserDepartments(user.id);
		res.json({ departments });
	});

	console.log('[OmiGroup] Department routes mounted');
}
