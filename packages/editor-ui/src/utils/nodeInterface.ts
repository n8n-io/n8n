/* eslint-disable id-denylist */
import type {
	GenericValue,
	IDataObject,
	INodeTypeDataInterface,
	INodeTypeDescription,
	INodeTypeDataGeneratedInterfaceType,
} from 'n8n-workflow';
import { ExpressionEvaluatorProxy } from 'n8n-workflow';
import { TEST_PIN_DATA } from '@/constants';
import { faker } from '@faker-js/faker';

function getArrayOfRandomLength(min = 2, max = 4) {
	return [...Array(Math.floor(Math.random() * (max - min) + min)).keys()];
}

export function resolveNodeInterfaceValue(
	type: INodeTypeDataGeneratedInterfaceType | `${INodeTypeDataGeneratedInterfaceType}[]`,
): GenericValue {
	const isArray = type.endsWith('[]');
	const resolvedType = isArray ? type.slice(0, -2) : type;

	const types: Record<string, () => GenericValue> = {
		string: () => faker.lorem.word(),
		username: () => faker.internet.userName(),
		name: () => faker.person.fullName(),
		firstName: () => faker.person.firstName(),
		lastName: () => faker.person.lastName(),
		title: () => faker.lorem.sentence(),
		word: () => faker.lorem.word(),
		sentence: () => faker.lorem.sentence(),
		paragraph: () => faker.lorem.paragraph(),
		number: () => faker.number.int(),
		boolean: () => faker.datatype.boolean(),
		uuid: () => faker.string.uuid(),
		datetime: () => faker.date.recent().toISOString(),
		url: () => faker.internet.url(),
		timestamp: () => faker.date.recent().getTime(),
		email: () => faker.internet.email(),
	};

	return types[resolvedType]
		? isArray
			? getArrayOfRandomLength().map(() => types[resolvedType]())
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
				resolved[key] = ExpressionEvaluatorProxy.evaluateExpression(value.slice(1), {
					...data,
					generate: resolveNodeInterfaceValue,
				}) as string;
			} else {
				resolved[key] = value;
			}
		} else if (Array.isArray(value)) {
			resolved[key] = value.map((item) =>
				typeof item === 'object' ? resolveNodeInterfaceData(item, data) : item,
			);
		} else if (value && typeof value === 'object') {
			resolved[key] = resolveNodeInterfaceData(value, data);
		}
	}

	return resolved;
}

export function resolveNodeOutputInterface(
	nodeType: INodeTypeDescription | null,
	data: IDataObject,
): IDataObject[] {
	const nodeTypeInterface = nodeType?.interface;
	if (!nodeTypeInterface) {
		return TEST_PIN_DATA;
	}

	const resourceKey = (nodeTypeInterface.resourceKey as string) || '={{resource}}';
	const resolvedResourceKey =
		(ExpressionEvaluatorProxy.evaluateExpression(
			resourceKey.startsWith('=') ? resourceKey.slice(1) : resourceKey,
			data,
		) as string) || 'default';
	const operationKey = (nodeTypeInterface.operationKey as string) || '={{operation}}';
	const resolvedOperationKey =
		(ExpressionEvaluatorProxy.evaluateExpression(
			operationKey.startsWith('=') ? operationKey.slice(1) : operationKey,
			data,
		) as string) || 'default';

	const outputInterface = nodeTypeInterface.output;
	const outputResourceInterface = outputInterface?.[resolvedResourceKey];
	const outputResourceOperationInterface = outputResourceInterface?.[resolvedOperationKey];
	if (!outputResourceOperationInterface) {
		return TEST_PIN_DATA;
	}

	return Array.isArray(outputResourceOperationInterface)
		? getArrayOfRandomLength().map(() =>
				resolveNodeInterfaceData(outputResourceOperationInterface[0], data),
		  )
		: [resolveNodeInterfaceData(outputResourceOperationInterface, data)];
}
