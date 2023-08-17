import type {
	ConnectionTypes,
	IExecuteFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function getSingleInputConnectionData(
	that: IExecuteFunctions,
	inputKey: ConnectionTypes,
	inputLabel: string
) {
	const inputsNodes = await that.getInputConnectionData(0, 0, inputKey);

	if (inputsNodes.length === 0) {
		throw new NodeOperationError(
			that.getNode(),
			`At least one ${inputLabel} has to be connected!`,
		);
	} else if (inputsNodes.length > 1) {
		throw new NodeOperationError(
			that.getNode(),
			`Only one ${inputLabel} is allowed to be connected!`,
		);
	}

	return inputsNodes[0].response;
}
