import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { BoardProxyProvider, IBoardProjectService, INode, Workflow } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { OwnershipService } from '@/services/ownership.service';

import {
	DataTableBoardService,
	type BoardItem,
	type CreateBoardDto,
	type UpdateBoardItemDto,
} from './data-table-board.service';

const ALLOWED_NODES = [
	'n8n-nodes-base.dataTable',
	'n8n-nodes-base.dataTableTool',
	'n8n-nodes-base.board',
	'n8n-nodes-base.boardTool',
	'n8n-nodes-base.boardTrigger',
] as const;

type AllowedNode = (typeof ALLOWED_NODES)[number];

function isAllowedNode(s: string): s is AllowedNode {
	return ALLOWED_NODES.includes(s as AllowedNode);
}

@Service()
export class DataTableBoardProxyService implements BoardProxyProvider {
	constructor(
		private readonly boardService: DataTableBoardService,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	private checkInstanceWriteAccess(): void {
		const preferences = this.sourceControlPreferencesService.getPreferences();
		if (preferences.branchReadOnly) {
			throw new ForbiddenError(
				'Cannot modify boards on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private validateRequest(node: INode) {
		if (!isAllowedNode(node.type)) {
			throw new Error('This proxy is only available for Board-related nodes');
		}
	}

	private async getProjectId(workflow: Workflow) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
		return homeProject.id;
	}

	async getBoardProxy(
		workflow: Workflow,
		node: INode,
		boardId: string,
		projectId?: string,
	): Promise<IBoardProjectService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeBoardOperations(projectId, boardId);
	}

	private makeBoardOperations(projectId: string, boardId: string): IBoardProjectService {
		const boardService = this.boardService;
		const checkWrite = () => this.checkInstanceWriteAccess();

		return {
			// Board CRUD
			async createBoard(dto: CreateBoardDto) {
				checkWrite();
				return await boardService.createBoard(projectId, dto);
			},

			async getBoard() {
				return await boardService.getBoard(boardId, projectId);
			},

			async updateBoard(dto: { name: string }) {
				checkWrite();
				return await boardService.updateBoard(boardId, projectId, dto);
			},

			async deleteBoard() {
				checkWrite();
				return await boardService.deleteBoard(boardId, projectId);
			},

			async listBoards() {
				return await boardService.listBoards(projectId);
			},

			// Item CRUD
			async createItem(item: BoardItem) {
				checkWrite();
				return await boardService.createItem(boardId, projectId, item);
			},

			async getItems(options?: { status?: string; skip?: number; take?: number }) {
				return await boardService.getItems(boardId, projectId, options);
			},

			async getItemById(itemId: string) {
				return await boardService.getItemById(boardId, projectId, itemId);
			},

			async updateItem(itemId: string, dto: UpdateBoardItemDto) {
				checkWrite();
				return await boardService.updateItem(boardId, projectId, itemId, dto);
			},

			async deleteItem(itemId: string) {
				checkWrite();
				return await boardService.deleteItem(boardId, projectId, itemId);
			},

			// Status CRUD
			async getStatuses() {
				return await boardService.getStatuses(boardId, projectId);
			},

			async addStatus(status: string) {
				checkWrite();
				return await boardService.addStatus(boardId, projectId, status);
			},

			async renameStatus(oldStatus: string, newStatus: string) {
				checkWrite();
				return await boardService.renameStatus(boardId, projectId, oldStatus, newStatus);
			},

			async deleteStatus(status: string, migrateTo?: string) {
				checkWrite();
				return await boardService.deleteStatus(boardId, projectId, status, migrateTo);
			},

			async reorderStatuses(orderedStatuses: string[]) {
				checkWrite();
				return await boardService.reorderStatuses(boardId, projectId, orderedStatuses);
			},
		};
	}
}
