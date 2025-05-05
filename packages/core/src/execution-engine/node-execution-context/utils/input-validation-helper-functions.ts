import type { INode, Workflow } from 'n8n-workflow';

import { InputValidationService } from './../../../input-validation-service';

async function isValid(schemaId: string, body: unknown): Promise<void> {
	return await InputValidationService.getInstance().isValid(schemaId, body);
}

export const getInputDataValidationHelperFunctions = (workflow: Workflow, node: INode) => ({
	async isValid(schemaId: string, body: unknown): Promise<void> {
		return await isValid(schemaId, body);
	},
});
