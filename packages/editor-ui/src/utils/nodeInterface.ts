/* eslint-disable id-denylist */

import type {
	IDataObject,
	INodeTypeDescription,
	INodeTypeInterface,
	INodeTypeDataInterface,
	INodeTypeDataInterfaceType,
	GenericValue,
} from 'n8n-workflow';
import { TEST_PIN_DATA } from '@/constants';
import { ExpressionEvaluatorProxy } from 'n8n-workflow';
import { faker } from '@faker-js/faker';

export function resolveNodeInterfaceValue(type: string): GenericValue {
	const isArray = type.endsWith('[]');
	const resolvedType = isArray ? type.slice(1, -2) : type.slice(1);

	const types: Record<string, () => GenericValue> = {
		string: () => faker.lorem.word(),
		username: () => faker.internet.userName(),
		title: () => faker.lorem.sentence(),
		lorem: () => faker.lorem.paragraph(),
		number: () => faker.number.int(),
		boolean: () => faker.datatype.boolean(),
		uuid: () => faker.string.uuid(),
		datetime: () => faker.date.recent().toISOString(),
		url: () => faker.internet.url(),
		timestamp: () => faker.date.recent().getTime(),
	};

	return types[resolvedType]
		? isArray
			? [0, 0, 0].map(() => types[resolvedType]())
			: types[resolvedType]()
		: resolvedType;
}

export function resolveNodeInterfaceData(
	interfaceDefinition: INodeTypeDataInterface,
	data: IDataObject,
): IDataObject {
	const resolved: IDataObject = {};
	for (const key of Object.keys(interfaceDefinition)) {
		if (!interfaceDefinition.hasOwnProperty(key)) {
			continue;
		}

		const value = interfaceDefinition[key];
		if (typeof value === 'string') {
			if (value.startsWith('=')) {
				resolved[key] = ExpressionEvaluatorProxy.evaluateExpression(value.slice(1), data) as string;
			} else if (value.startsWith('@')) {
				resolved[key] = resolveNodeInterfaceValue(value);
			} else {
				resolved[key] = value;
			}
		} else if (Array.isArray(value)) {
			resolved[key] = value[0];
		} else if (typeof value === 'object') {
			resolved[key] = resolveNodeInterfaceData(value, data);
		}
	}

	return resolved;
}

export function resolveNodeOutputInterface(
	nodeType: INodeTypeDescription | null,
	data: IDataObject,
): IDataObject[] {
	const nodeTypeInterface = nodeType?.interface as INodeTypeInterface;
	if (!nodeType || !nodeTypeInterface) {
		return TEST_PIN_DATA;
	}

	const resourceKey = (nodeTypeInterface.resourceKey as string) || '={{resource}}';
	const resolvedResourceKey = ExpressionEvaluatorProxy.evaluateExpression(
		resourceKey.startsWith('=') ? resourceKey.slice(1) : resourceKey,
		data,
	) as string;
	const operationKey = (nodeTypeInterface.operationKey as string) || '={{operation}}';
	const resolvedOperationKey = ExpressionEvaluatorProxy.evaluateExpression(
		operationKey.startsWith('=') ? operationKey.slice(1) : operationKey,
		data,
	) as string;

	const outputInterface = nodeTypeInterface.output;
	const outputResourceInterface =
		outputInterface?.[resolvedResourceKey] || outputInterface?.default;
	const outputResourceOperationInterface =
		outputResourceInterface?.[resolvedOperationKey] || outputResourceInterface?.default;

	console.log({
		outputInterface,
		outputResourceInterface,
		outputResourceOperationInterface,
		resolvedResourceKey,
		resolvedOperationKey,
	});
	if (!outputResourceOperationInterface) {
		return TEST_PIN_DATA;
	}

	const resolvedInterfaceData = resolveNodeInterfaceData(outputResourceOperationInterface, data);

	console.log('outputResourceOperationInterface', outputResourceOperationInterface, data, nodeType);

	return [resolvedInterfaceData];
}
