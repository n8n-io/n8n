import {
	getFieldEntries,
	getWorkflowInputData,
} from 'n8n-nodes-base/dist/utils/workflowInputsResourceMapping/GenericFunctions';
import type {
	ISupplyDataFunctions,
	IDataObject,
	FieldValueOption,
	ResourceMapperField,
	ILocalLoadOptionsFunctions,
	ResourceMapperFields,
} from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

export async function loadWorkflowInputMappings(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const nodeLoadContext = await this.getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	let fields: ResourceMapperField[] = [];
	if (nodeLoadContext) {
		const fieldValues = getFieldEntries(nodeLoadContext);
		fields = fieldValues.map((currentWorkflowInput) => {
			const field: ResourceMapperField = {
				id: currentWorkflowInput.name,
				displayName: currentWorkflowInput.name,
				required: false,
				defaultMatch: false,
				display: true,
				canBeUsedToMatch: true,
			};

			if (currentWorkflowInput.type !== 'any') {
				field.type = currentWorkflowInput.type;
			}

			return field;
		});
	}
	return { fields };
}

export function getWorkflowInputValues(this: ISupplyDataFunctions) {
	const inputData = this.getInputData();

	return inputData.map((item, itemIndex) => {
		const itemFieldValues = this.getNodeParameter(
			'workflowInputs.value',
			itemIndex,
			{},
		) as IDataObject;

		return {
			json: {
				...item.json,
				...itemFieldValues,
			},
			index: itemIndex,
			pairedItem: {
				item: itemIndex,
			},
		};
	});
}

export function getCurrentWorkflowInputData(this: ISupplyDataFunctions) {
	const inputData = getWorkflowInputValues.call(this);

	const schema = this.getNodeParameter('workflowInputs.schema', 0, []) as ResourceMapperField[];

	if (schema.length === 0) {
		return inputData;
	} else {
		const newParams = schema
			.filter((x) => !x.removed)
			.map((x) => ({ name: x.displayName, type: x.type ?? 'any' })) as FieldValueOption[];

		return getWorkflowInputData.call(this, inputData, newParams);
	}
}
