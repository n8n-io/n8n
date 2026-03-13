import { Router } from 'express';
import type { Request, Response } from 'express';

import { WorkflowEntity } from '../database/entities/workflow.entity';
import { WebhookEntity } from '../database/entities/webhook.entity';
import type { WebhookTriggerConfig } from '../sdk/types';
import type { AppDependencies } from './server';

export function createWorkflowRouter(deps: AppDependencies): Router {
	const router = Router();
	const { dataSource, transpiler } = deps;

	// GET /api/workflows - List all workflows (latest version of each)
	router.get('/', async (_req: Request, res: Response) => {
		try {
			// Get the latest version of each non-deleted workflow, sorted by name
			const workflows = await dataSource.query(`
				SELECT * FROM (
					SELECT DISTINCT ON (w.id) w.id, w.version, w.name, w.active, w."createdAt"
					FROM workflow w
					WHERE w."deletedAt" IS NULL
					ORDER BY w.id, w.version DESC
				) sub
				ORDER BY sub.name ASC
			`);

			res.status(200).json(workflows);
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflows - Create workflow
	router.post('/', async (req: Request, res: Response) => {
		try {
			const { name, code, settings } = req.body as {
				name: string;
				code: string;
				settings?: Record<string, unknown>;
			};

			if (!name || !code) {
				res.status(400).json({ error: 'name and code are required' });
				return;
			}

			// Transpile the code
			const compiled = transpiler.compile(code);

			if (compiled.errors.length > 0) {
				res.status(422).json({ errors: compiled.errors });
				return;
			}

			// Generate a UUID for the new workflow
			const id = crypto.randomUUID();

			// Create first version of the workflow
			const workflow = new WorkflowEntity();
			workflow.id = id;
			workflow.version = 1;
			workflow.name = name;
			workflow.code = code;
			workflow.compiledCode = compiled.code;
			workflow.triggers = compiled.triggers;
			workflow.settings = settings ?? {};
			workflow.graph = compiled.graph;
			workflow.sourceMap = compiled.sourceMap;
			workflow.active = false;

			const saved = await dataSource.getRepository(WorkflowEntity).save(workflow);

			res.status(201).json({
				id,
				version: 1,
				name: saved.name,
				graph: compiled.graph,
				active: saved.active,
				createdAt: saved.createdAt,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// PUT /api/workflows/:id - Save (creates new version)
	router.put('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { name, code, settings } = req.body as {
				name: string;
				code: string;
				settings?: Record<string, unknown>;
			};

			if (!code) {
				res.status(400).json({ error: 'code is required' });
				return;
			}

			// Find latest version and check if workflow exists and is not deleted
			const latest = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id })
				.orderBy('w.version', 'DESC')
				.limit(1)
				.getOne();

			if (!latest || latest.deletedAt) {
				res.status(404).json({ error: 'Workflow not found' });
				return;
			}

			// Transpile the code
			const compiled = transpiler.compile(code);

			if (compiled.errors.length > 0) {
				res.status(422).json({ errors: compiled.errors });
				return;
			}

			const nextVersion = latest.version + 1;

			// Create new version, carrying forward active and deletedAt
			const workflow = new WorkflowEntity();
			workflow.id = id;
			workflow.version = nextVersion;
			workflow.name = name ?? latest.name ?? 'Untitled';
			workflow.code = code;
			workflow.compiledCode = compiled.code;
			workflow.triggers = compiled.triggers;
			workflow.settings = settings ?? latest.settings ?? {};
			workflow.graph = compiled.graph;
			workflow.sourceMap = compiled.sourceMap;
			workflow.active = latest.active;
			workflow.deletedAt = latest.deletedAt;

			await dataSource.getRepository(WorkflowEntity).save(workflow);

			res.status(200).json({
				id,
				version: nextVersion,
				graph: compiled.graph,
				active: latest.active,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// GET /api/workflows/:id/versions - List all versions
	router.get('/:id/versions', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Check if workflow exists and is not deleted (check any version)
			const anyVersion = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id })
				.orderBy('w.version', 'DESC')
				.limit(1)
				.getOne();

			if (!anyVersion || anyVersion.deletedAt) {
				res.status(404).json({ error: 'Workflow not found' });
				return;
			}

			const versions = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.select(['w.id', 'w.version', 'w.name', 'w.createdAt'])
				.where('w.id = :id', { id })
				.orderBy('w.version', 'DESC')
				.getMany();

			res.status(200).json(
				versions.map((v) => ({
					id: v.id,
					version: v.version,
					name: v.name,
					createdAt: v.createdAt,
				})),
			);
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// GET /api/workflows/:id - Get latest or specific version
	router.get('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const versionParam = req.query.version as string | undefined;

			const queryBuilder = dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id });

			if (versionParam !== undefined) {
				queryBuilder.andWhere('w.version = :version', {
					version: parseInt(versionParam, 10),
				});
			} else {
				queryBuilder.orderBy('w.version', 'DESC').limit(1);
			}

			const workflow = await queryBuilder.getOne();

			if (!workflow || workflow.deletedAt) {
				res.status(404).json({ error: 'Workflow not found' });
				return;
			}

			res.status(200).json({
				id: workflow.id,
				version: workflow.version,
				name: workflow.name,
				code: workflow.code,
				triggers: workflow.triggers,
				settings: workflow.settings,
				graph: workflow.graph,
				active: workflow.active,
				createdAt: workflow.createdAt,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// DELETE /api/workflows/:id - Soft delete
	router.delete('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Check if workflow exists and is not already deleted
			const latest = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id })
				.orderBy('w.version', 'DESC')
				.limit(1)
				.getOne();

			if (!latest || latest.deletedAt) {
				res.status(404).json({ error: 'Workflow not found' });
				return;
			}

			// Set deletedAt on ALL versions with this id
			await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder()
				.update(WorkflowEntity)
				.set({ deletedAt: new Date() })
				.where('id = :id', { id })
				.execute();

			res.status(200).json({ id, deleted: true });
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflows/:id/activate - Register webhooks, mark active
	router.post('/:id/activate', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Check if workflow exists and is not deleted
			const workflow = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id })
				.orderBy('w.version', 'DESC')
				.limit(1)
				.getOne();

			if (!workflow || workflow.deletedAt) {
				res.status(404).json({ error: 'Workflow not found' });
				return;
			}

			// Create webhook records from triggers config
			const triggers = (workflow.triggers ?? []) as WebhookTriggerConfig[];
			const webhookTriggers = triggers.filter((t) => t.type === 'webhook');

			for (const trigger of webhookTriggers) {
				const webhook = new WebhookEntity();
				webhook.workflowId = id;
				webhook.method = trigger.config.method.toUpperCase();
				webhook.path = trigger.config.path.replace(/^\//, ''); // strip leading slash

				// Use upsert-like behavior: skip if exists
				await dataSource
					.getRepository(WebhookEntity)
					.createQueryBuilder()
					.insert()
					.into(WebhookEntity)
					.values({
						workflowId: id,
						method: webhook.method,
						path: webhook.path,
					})
					.orIgnore()
					.execute();
			}

			// Mark ALL versions as active
			await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder()
				.update(WorkflowEntity)
				.set({ active: true })
				.where('id = :id', { id })
				.execute();

			res.status(200).json({ id, active: true });
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflows/:id/deactivate - Remove webhooks, mark inactive
	router.post('/:id/deactivate', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Check if workflow exists and is not deleted
			const latest = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id })
				.orderBy('w.version', 'DESC')
				.limit(1)
				.getOne();

			if (!latest || latest.deletedAt) {
				res.status(404).json({ error: 'Workflow not found' });
				return;
			}

			// Delete all webhook records for this workflow
			await dataSource
				.getRepository(WebhookEntity)
				.createQueryBuilder()
				.delete()
				.from(WebhookEntity)
				.where('workflowId = :id', { id })
				.execute();

			// Mark ALL versions as inactive
			await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder()
				.update(WorkflowEntity)
				.set({ active: false })
				.where('id = :id', { id })
				.execute();

			res.status(200).json({ id, active: false });
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	return router;
}
