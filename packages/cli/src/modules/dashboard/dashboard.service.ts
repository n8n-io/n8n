import type {
	BrokenRef,
	CreateDashboardDto,
	DashboardListOptions,
	DashboardShareRole,
	DashboardSpec,
	UpdateDashboardDto,
} from '@n8n/api-types';
import { dashboardSpecReadSchema, dashboardSpecSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { DataTableColumnRepository } from '@/modules/data-table/data-table-column.repository';

import { DashboardShareRepository } from './dashboard-share.repository';
import { DashboardRepository } from './dashboard.repository';
import { DashboardConflictError } from './errors/dashboard-conflict.error';
import { DashboardNameConflictError } from './errors/dashboard-name-conflict.error';
import { DashboardNotFoundError } from './errors/dashboard-not-found.error';
import { DashboardValidationError } from './errors/dashboard-validation.error';

@Service()
export class DashboardService {
	constructor(
		private readonly dashboardRepository: DashboardRepository,
		private readonly dashboardShareRepository: DashboardShareRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('dashboard');
	}

	async start() {}
	async shutdown() {}

	async createDashboard(projectId: string, dto: CreateDashboardDto) {
		await this.validateUniqueName(dto.name, projectId);
		// On WRITE, only the strict v2 spec (views[]) is accepted.
		const parsed = dashboardSpecSchema.safeParse(dto.spec);
		if (!parsed.success) {
			throw new DashboardValidationError(
				`Invalid dashboard spec: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
			);
		}
		return await this.dashboardRepository.createDashboard(projectId, {
			...dto,
			spec: parsed.data,
		});
	}

	async getDashboard(dashboardId: string, projectId: string) {
		const dashboard = await this.validateDashboardExists(dashboardId, projectId);
		// On READ, accept both legacy flat-widgets and v2 views shapes so old rows
		// keep opening. Client-side migrator normalizes to v2 before render.
		const parsed = dashboardSpecReadSchema.safeParse(dashboard.spec);
		if (!parsed.success) {
			this.logger.warn('Dashboard spec failed read validation; returning raw spec', {
				dashboardId,
				issueCount: parsed.error.issues.length,
			});
		}
		const brokenRefs = await this.detectBrokenRefs(dashboard.spec);
		return { ...dashboard, brokenRefs };
	}

	/**
	 * Walk every widget in the spec and check that each referenced data table
	 * still exists and that every referenced column is still present in its
	 * schema. Returns one entry per broken ref — empty array means everything
	 * is in sync.
	 *
	 * Cheap to run on every GET: one query per distinct data-table ID.
	 */
	async detectBrokenRefs(
		spec: DashboardSpec | { widgets?: unknown[]; views?: Array<{ widgets: unknown[] }> },
	): Promise<BrokenRef[]> {
		const out: BrokenRef[] = [];

		const allWidgets: Array<Record<string, unknown>> = [
			...((spec as { widgets?: Record<string, unknown>[] }).widgets ?? []),
			...((spec as { views?: Array<{ widgets: Record<string, unknown>[] }> }).views ?? []).flatMap(
				(v) => v.widgets,
			),
		];

		// Build a per-table set of valid column names, querying only distinct table IDs.
		const tableIds = new Set<string>();
		for (const w of allWidgets) {
			const ds = w.dataSource as { dataTableId?: string } | undefined;
			if (ds?.dataTableId) tableIds.add(ds.dataTableId);
		}
		const columnIndex = new Map<string, Set<string>>();
		for (const tableId of tableIds) {
			try {
				const cols = await this.dataTableColumnRepository.getColumns(tableId);
				columnIndex.set(tableId, new Set(cols.map((c) => c.name)));
			} catch {
				columnIndex.set(tableId, new Set()); // missing table — every column ref is broken
			}
		}

		for (const w of allWidgets) {
			const ds = w.dataSource as
				| { dataTableId?: string; filter?: unknown; sort?: unknown }
				| undefined;
			const widgetId = String(w.id ?? '');
			const dataTableId = ds?.dataTableId ?? '';
			if (!dataTableId) continue;
			const validColumns = columnIndex.get(dataTableId);
			if (!validColumns || validColumns.size === 0) {
				out.push({
					kind: 'data-table',
					widgetId,
					dataTableId,
					message: `Data table "${dataTableId}" no longer exists or has no columns.`,
				});
				continue;
			}

			const refs = this.collectColumnRefs(w);
			for (const col of refs) {
				if (!validColumns.has(col)) {
					out.push({
						kind: 'column',
						widgetId,
						dataTableId,
						column: col,
						message: `Column "${col}" is no longer present in data table "${dataTableId}".`,
					});
				}
			}
		}

		return out;
	}

	private collectColumnRefs(widget: Record<string, unknown>): string[] {
		const refs = new Set<string>();
		const type = String(widget.type ?? '');

		const filter = (widget.dataSource as { filter?: { filters?: Array<{ columnName?: string }> } })
			?.filter;
		for (const f of filter?.filters ?? []) {
			if (f.columnName) refs.add(f.columnName);
		}
		const sort = (widget.dataSource as { sort?: Array<{ column?: string }> })?.sort;
		for (const s of sort ?? []) {
			if (s.column) refs.add(s.column);
		}

		if (type === 'kpi') {
			const agg = widget.aggregate as { column?: string } | undefined;
			if (agg?.column) refs.add(agg.column);
		} else if (type === 'chart') {
			const xAxis = widget.xAxis as string | undefined;
			if (xAxis) refs.add(xAxis);
			const yAxis = widget.yAxis as Array<{ column?: string }> | undefined;
			for (const y of yAxis ?? []) {
				if (y.column) refs.add(y.column);
			}
			const groupBy = widget.groupBy as Array<string | { column?: string }> | undefined;
			for (const g of groupBy ?? []) {
				const col = typeof g === 'string' ? g : g.column;
				if (col) refs.add(col);
			}
		} else if (type === 'table') {
			const cols = widget.columns as Array<{ key?: string }> | undefined;
			for (const c of cols ?? []) {
				if (c.key) refs.add(c.key);
			}
		}

		return [...refs];
	}

	async updateDashboard(dashboardId: string, projectId: string, dto: UpdateDashboardDto) {
		const existing = await this.validateDashboardExists(dashboardId, projectId);

		if (dto.expectedVersion !== undefined && existing.version !== dto.expectedVersion) {
			throw new DashboardConflictError(existing.version);
		}

		if (dto.name) {
			await this.validateUniqueName(dto.name, projectId, dashboardId);
		}

		const updateData: Record<string, unknown> = {};
		if (dto.name !== undefined) updateData.name = dto.name;
		if (dto.description !== undefined) updateData.description = dto.description;
		if (dto.spec !== undefined) {
			const parsed = dashboardSpecSchema.safeParse(dto.spec);
			if (!parsed.success) {
				throw new DashboardValidationError(
					`Invalid dashboard spec: ${parsed.error.issues.map((i) => i.message).join('; ')}`,
				);
			}
			updateData.spec = parsed.data;
		}
		if (dto.tags !== undefined) updateData.tags = dto.tags;
		if (dto.archived !== undefined) updateData.archived = dto.archived;
		updateData.version = existing.version + 1;

		await this.dashboardRepository.update({ id: dashboardId }, updateData);

		return await this.dashboardRepository.findFullById(dashboardId);
	}

	async deleteDashboard(dashboardId: string, projectId: string) {
		await this.validateDashboardExists(dashboardId, projectId);
		await this.dashboardRepository.deleteDashboard(dashboardId);
		return true;
	}

	async getManyAndCount(options: DashboardListOptions) {
		return await this.dashboardRepository.getManyAndCount(options);
	}

	async shareDashboard(
		dashboardId: string,
		projectId: string,
		userIds: string[],
		role: DashboardShareRole,
	) {
		await this.validateDashboardExists(dashboardId, projectId);

		const entities = userIds.map((userId) => ({
			dashboardId,
			userId,
			role,
		}));

		await this.dashboardShareRepository.upsert(entities, ['dashboardId', 'userId']);

		return await this.dashboardShareRepository.findByDashboardId(dashboardId);
	}

	async unshareDashboard(dashboardId: string, projectId: string, userId: string) {
		await this.validateDashboardExists(dashboardId, projectId);
		await this.dashboardShareRepository.delete({ dashboardId, userId });
		return true;
	}

	async getProjectIdForDashboard(dashboardId: string): Promise<string> {
		const dashboard = await this.dashboardRepository.findOne({
			select: ['projectId'],
			where: { id: dashboardId },
		});
		if (!dashboard) throw new DashboardNotFoundError(dashboardId);
		return dashboard.projectId;
	}

	/** Collect every data-table ID referenced by widgets in the spec. */
	collectDataTableIds(
		spec: DashboardSpec | { widgets?: unknown[]; views?: Array<{ widgets: unknown[] }> },
	): string[] {
		const ids = new Set<string>();
		const allWidgets: unknown[] = [
			...((spec as { widgets?: unknown[] }).widgets ?? []),
			...((spec as { views?: Array<{ widgets: unknown[] }> }).views ?? []).flatMap(
				(v) => v.widgets,
			),
		];
		for (const w of allWidgets) {
			const widget = w as { dataSource?: { dataTableId?: string } };
			if (widget.dataSource?.dataTableId) ids.add(widget.dataSource.dataTableId);
		}
		return [...ids];
	}

	private async validateDashboardExists(dashboardId: string, projectId: string) {
		const existing = await this.dashboardRepository.findOne({
			where: { id: dashboardId, projectId },
			relations: ['project'],
		});
		if (!existing) throw new DashboardNotFoundError(dashboardId);
		return existing;
	}

	private async validateUniqueName(name: string, projectId: string, excludeId?: string) {
		const found = await this.dashboardRepository.findOne({
			where: { name, projectId },
			select: ['id'],
		});
		if (found && found.id !== excludeId) {
			throw new DashboardNameConflictError(
				`A dashboard with the name "${name}" already exists in this project`,
			);
		}
	}
}
