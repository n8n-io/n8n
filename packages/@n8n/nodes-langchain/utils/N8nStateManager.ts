import { type IExecuteFunctions, NodeConnectionTypes } from 'n8n-workflow';

export type N8nStateManager = object;

export async function getOptionalStateManager(
	ctx: IExecuteFunctions,
): Promise<N8nStateManager | undefined> {
	let stateManager: N8nStateManager | undefined;

	if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
		stateManager = (await ctx.getInputConnectionData(
			NodeConnectionTypes.AiStateManager,
			0,
		)) as N8nStateManager;
	}

	return stateManager;
}
