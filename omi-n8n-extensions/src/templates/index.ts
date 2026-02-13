/**
 * Internal Template Hub for OmiGroup
 *
 * Allows employees to publish, discover, and deploy workflow templates
 * within the organization. Supports:
 * - Publishing a workflow as a template
 * - Category-based organization
 * - Department-scoped visibility
 * - Optional admin approval flow
 * - Ratings and usage tracking
 */

import type { Express, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getOmiDb } from '../database';
import { getConfig } from '../config';
import { verifyAuthenticated, verifyOmiAdmin, getOmiUser } from '../middleware/auth-guard';
import { getUserDepartments } from '../departments';

// -----------------------------------------------
// Template CRUD
// -----------------------------------------------

export interface Template {
	id: string;
	name: string;
	description: string;
	category_id: string | null;
	workflow_json: string;
	author_id: string;
	department_id: string | null;
	visibility: 'public' | 'department' | 'private';
	status: 'draft' | 'pending' | 'approved' | 'rejected';
	rating_avg: number;
	rating_count: number;
	use_count: number;
	tags: string;
	created_at: string;
	updated_at: string;
}

export interface TemplateCategory {
	id: string;
	name: string;
	description: string;
	icon: string;
	sort_order: number;
}

// -----------------------------------------------
// API Routes
// -----------------------------------------------

export function mountTemplateRoutes(app: Express): void {
	const config = getConfig();

	if (!config.templates.enabled) {
		console.log('[OmiGroup] Template Hub is disabled');
		return;
	}

	// ==========================================
	// Categories
	// ==========================================

	// GET /omi/templates/categories
	app.get('/omi/templates/categories', verifyAuthenticated, (_req: Request, res: Response) => {
		const db = getOmiDb();
		const categories = db
			.prepare('SELECT * FROM omi_template_category ORDER BY sort_order, name')
			.all();
		res.json({ categories });
	});

	// POST /omi/templates/categories (admin)
	app.post('/omi/templates/categories', verifyOmiAdmin, (req: Request, res: Response) => {
		const { name, description, icon, sortOrder } = req.body as {
			name?: string;
			description?: string;
			icon?: string;
			sortOrder?: number;
		};

		if (!name) return res.status(400).json({ error: 'Name is required' });

		const db = getOmiDb();
		const id = uuid();
		db.prepare(`
			INSERT INTO omi_template_category (id, name, description, icon, sort_order)
			VALUES (?, ?, ?, ?, ?)
		`).run(id, name, description ?? '', icon ?? '', sortOrder ?? 0);

		const category = db.prepare('SELECT * FROM omi_template_category WHERE id = ?').get(id);
		res.status(201).json({ category });
	});

	// ==========================================
	// Templates
	// ==========================================

	// GET /omi/templates - List/search templates
	app.get('/omi/templates', verifyAuthenticated, (req: Request, res: Response) => {
		const user = getOmiUser(req)!;
		const {
			search,
			category,
			department,
			status: statusFilter,
			limit: limitStr,
			offset: offsetStr,
		} = req.query as Record<string, string>;

		const limit = parseInt(limitStr ?? '20', 10);
		const offset = parseInt(offsetStr ?? '0', 10);

		const db = getOmiDb();
		const conditions: string[] = [];
		const params: unknown[] = [];

		// Visibility: user can see public + their department's + their own
		const userDepts = getUserDepartments(user.id).map((d) => d.id);
		const deptPlaceholders = userDepts.map(() => '?').join(',');

		if (userDepts.length > 0) {
			conditions.push(`(
				t.visibility = 'public'
				OR (t.visibility = 'department' AND t.department_id IN (${deptPlaceholders}))
				OR t.author_id = ?
			)`);
			params.push(...userDepts, user.id);
		} else {
			conditions.push(`(t.visibility = 'public' OR t.author_id = ?)`);
			params.push(user.id);
		}

		// Only show approved templates (unless user is viewing their own)
		if (statusFilter) {
			conditions.push('t.status = ?');
			params.push(statusFilter);
		} else {
			conditions.push(`(t.status = 'approved' OR t.author_id = ?)`);
			params.push(user.id);
		}

		if (search) {
			conditions.push('(t.name LIKE ? OR t.description LIKE ?)');
			params.push(`%${search}%`, `%${search}%`);
		}

		if (category) {
			conditions.push('t.category_id = ?');
			params.push(category);
		}

		if (department) {
			conditions.push('t.department_id = ?');
			params.push(department);
		}

		const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

		const countRow = db
			.prepare(`SELECT COUNT(*) as count FROM omi_template t ${where}`)
			.get(...params) as { count: number };

		const templates = db
			.prepare(`
				SELECT t.*, c.name as category_name
				FROM omi_template t
				LEFT JOIN omi_template_category c ON t.category_id = c.id
				${where}
				ORDER BY t.use_count DESC, t.rating_avg DESC, t.created_at DESC
				LIMIT ? OFFSET ?
			`)
			.all(...params, limit, offset);

		res.json({
			total: countRow.count,
			templates,
			limit,
			offset,
		});
	});

	// GET /omi/templates/:id - Template detail
	app.get('/omi/templates/:id', verifyAuthenticated, (req: Request, res: Response) => {
		const db = getOmiDb();
		const template = db
			.prepare(`
				SELECT t.*, c.name as category_name
				FROM omi_template t
				LEFT JOIN omi_template_category c ON t.category_id = c.id
				WHERE t.id = ?
			`)
			.get(req.params.id);

		if (!template) return res.status(404).json({ error: 'Template not found' });

		// Get ratings
		const ratings = db
			.prepare('SELECT * FROM omi_template_rating WHERE template_id = ? ORDER BY created_at DESC')
			.all(req.params.id);

		res.json({ template, ratings });
	});

	// POST /omi/templates - Publish a workflow as template
	app.post('/omi/templates', verifyAuthenticated, (req: Request, res: Response) => {
		const user = getOmiUser(req)!;
		const {
			name,
			description,
			categoryId,
			workflowJson,
			departmentId,
			visibility,
			tags,
		} = req.body as {
			name?: string;
			description?: string;
			categoryId?: string;
			workflowJson?: string;
			departmentId?: string;
			visibility?: string;
			tags?: string[];
		};

		if (!name || !workflowJson) {
			return res.status(400).json({ error: 'Name and workflowJson are required' });
		}

		// Validate JSON
		try {
			JSON.parse(workflowJson);
		} catch {
			return res.status(400).json({ error: 'Invalid workflow JSON' });
		}

		const db = getOmiDb();
		const id = uuid();
		const now = new Date().toISOString();
		const status = config.templates.requireApproval ? 'pending' : 'approved';

		db.prepare(`
			INSERT INTO omi_template
			(id, name, description, category_id, workflow_json, author_id, department_id, visibility, status, tags, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			id,
			name,
			description ?? '',
			categoryId ?? null,
			workflowJson,
			user.id,
			departmentId ?? null,
			visibility ?? 'public',
			status,
			JSON.stringify(tags ?? []),
			now,
			now,
		);

		const template = db.prepare('SELECT * FROM omi_template WHERE id = ?').get(id);
		res.status(201).json({ template });
	});

	// POST /omi/templates/:id/deploy - Deploy template to create a workflow
	app.post('/omi/templates/:id/deploy', verifyAuthenticated, (req: Request, res: Response) => {
		const db = getOmiDb();
		const template = db
			.prepare('SELECT * FROM omi_template WHERE id = ?')
			.get(req.params.id) as Template | undefined;

		if (!template) return res.status(404).json({ error: 'Template not found' });

		// Increment use count
		db.prepare('UPDATE omi_template SET use_count = use_count + 1 WHERE id = ?').run(
			template.id,
		);

		// Return the workflow JSON for the frontend to create the workflow
		// The actual workflow creation is done by n8n's existing API
		res.json({
			workflowData: JSON.parse(template.workflow_json),
			templateName: template.name,
			message: 'Use this data with POST /rest/workflows to create the workflow',
		});
	});

	// POST /omi/templates/:id/rate - Rate a template
	app.post('/omi/templates/:id/rate', verifyAuthenticated, (req: Request, res: Response) => {
		const user = getOmiUser(req)!;
		const { score, comment } = req.body as { score?: number; comment?: string };

		if (!score || score < 1 || score > 5) {
			return res.status(400).json({ error: 'Score must be between 1 and 5' });
		}

		const db = getOmiDb();

		// Upsert rating
		db.prepare(`
			INSERT INTO omi_template_rating (template_id, user_id, score, comment)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(template_id, user_id) DO UPDATE SET
				score = excluded.score,
				comment = excluded.comment,
				created_at = datetime('now')
		`).run(req.params.id, user.id, score, comment ?? '');

		// Update average rating
		const avgRow = db
			.prepare(`
				SELECT AVG(score) as avg, COUNT(*) as count
				FROM omi_template_rating WHERE template_id = ?
			`)
			.get(req.params.id) as { avg: number; count: number };

		db.prepare('UPDATE omi_template SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
			avgRow.avg,
			avgRow.count,
			req.params.id,
		);

		res.json({ success: true, rating_avg: avgRow.avg, rating_count: avgRow.count });
	});

	// PUT /omi/templates/:id/approve - Admin approve/reject template
	app.put('/omi/templates/:id/approve', verifyOmiAdmin, (req: Request, res: Response) => {
		const { status } = req.body as { status?: 'approved' | 'rejected' };
		if (!status || !['approved', 'rejected'].includes(status)) {
			return res.status(400).json({ error: 'Status must be "approved" or "rejected"' });
		}

		const db = getOmiDb();
		const result = db
			.prepare('UPDATE omi_template SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
			.run(status, req.params.id);

		if ((result.changes ?? 0) === 0) {
			return res.status(404).json({ error: 'Template not found' });
		}

		res.json({ success: true, status });
	});

	// DELETE /omi/templates/:id - Delete template (author or admin)
	app.delete('/omi/templates/:id', verifyAuthenticated, (req: Request, res: Response) => {
		const user = getOmiUser(req)!;
		const db = getOmiDb();

		const template = db
			.prepare('SELECT * FROM omi_template WHERE id = ?')
			.get(req.params.id) as Template | undefined;

		if (!template) return res.status(404).json({ error: 'Template not found' });

		// Only author or admin can delete
		const config = getConfig();
		const isAdmin = config.admin.emails.includes(user.email.toLowerCase());
		if (template.author_id !== user.id && !isAdmin) {
			return res.status(403).json({ error: 'Only the author or an admin can delete this template' });
		}

		db.prepare('DELETE FROM omi_template WHERE id = ?').run(req.params.id);
		res.json({ success: true });
	});

	console.log('[OmiGroup] Template Hub routes mounted');
}
