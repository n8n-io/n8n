import type {
	IBoardProjectService,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	ITriggerFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { BOARD_ID_FIELD } from './fields';

type BoardContext = IExecuteFunctions | ILoadOptionsFunctions | ITriggerFunctions;

export async function resolveBoardId(
	ctx: BoardContext,
	resourceLocator: { mode: 'list' | 'id' | 'name'; value: string },
): Promise<string> {
	if (resourceLocator.mode === 'name') {
		const proxy = await getBoardProxyForCtx(ctx, '');
		const response = await proxy.listBoards();

		const match = response.data.find(
			(b) => b.name.toLowerCase() === resourceLocator.value.toLowerCase(),
		);
		if (!match) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Board with name "${resourceLocator.value}" not found`,
			);
		}

		return match.id;
	}

	return resourceLocator.value;
}

export async function getBoardProxyExecute(
	ctx: IExecuteFunctions,
	index: number = 0,
): Promise<IBoardProjectService> {
	if (ctx.helpers.getBoardProxy === undefined) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Board node but the module is disabled',
		);
	}

	const resourceLocator = ctx.getNodeParameter(BOARD_ID_FIELD, index) as {
		mode: 'list' | 'id' | 'name';
		value: string;
	};

	const boardId = await resolveBoardId(ctx, resourceLocator);

	return await ctx.helpers.getBoardProxy(boardId);
}

export async function getBoardAggregateProxy(ctx: BoardContext): Promise<IBoardProjectService> {
	return await getBoardProxyForCtx(ctx, '');
}

async function getBoardProxyForCtx(
	ctx: BoardContext,
	boardId: string,
): Promise<IBoardProjectService> {
	if (ctx.helpers.getBoardProxy === undefined) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Attempted to use Board node but the module is disabled',
		);
	}

	return await ctx.helpers.getBoardProxy(boardId);
}

export function validateNonEmpty(value: unknown, fieldName: string, node: INode): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new NodeOperationError(node, `${fieldName} must not be empty`);
	}
	return value.trim();
}
