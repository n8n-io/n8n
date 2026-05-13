import {
	type ExecuteEphemeralNodeResponse,
	executeEphemeralNodeResponseSchema,
	type ExecuteEphemeralNodeRequestDto,
} from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import type {
	IDataObject,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
} from 'n8n-workflow';

import type {
	InlineNodeExecutionRequest,
	NodeExecutionResult,
} from '@/node-execution/ephemeral-node-executor';

export function toInlineRequest(
	dto: ExecuteEphemeralNodeRequestDto,
	projectId: string,
): InlineNodeExecutionRequest {
	const credentialDetails: Record<string, INodeCredentialsDetails> | undefined = dto.credentials
		? Object.fromEntries(
				Object.entries(dto.credentials).map(([credType, detail]) => [
					credType,
					{ id: detail.id, name: detail.name },
				]),
			)
		: undefined;

	const inputData: INodeExecutionData[] = (dto.inputData ?? []).map((item) => ({
		json: item as IDataObject,
	}));

	return {
		nodeType: dto.nodeType,
		nodeTypeVersion: dto.nodeTypeVersion,
		nodeParameters: dto.nodeParameters as INodeParameters,
		credentialDetails,
		inputData,
		projectId,
	};
}

export function toPublicResponse(result: NodeExecutionResult): ExecuteEphemeralNodeResponse {
	const parsed = executeEphemeralNodeResponseSchema.safeParse({
		status: result.status,
		data: result.data.map((item) => item.json),
		error: result.error,
	});

	if (!parsed.success) {
		throw new UnexpectedError('Failed to serialize ephemeral node execution response', {
			cause: parsed.error,
		});
	}

	return parsed.data;
}
