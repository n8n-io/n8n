import isObject from 'lodash/isObject';
import type { AssignmentValue, IDataObject } from 'n8n-workflow';
import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { v4 as uuid } from 'uuid';

export function inferAssignmentType(value: unknown): string {
	if (typeof value === 'boolean') return 'boolean';
	if (typeof value === 'number') return 'number';
	if (typeof value === 'string') return 'string';
	if (Array.isArray(value)) return 'array';
	if (isObject(value)) return 'object';
	return 'string';
}

export function typeFromExpression(expression: string): string {
	try {
		const resolved = resolveParameter(`=${expression}`);
		return inferAssignmentType(resolved);
	} catch (error) {
		return 'string';
	}
}

export function inputDataToAssignments(input: IDataObject): AssignmentValue[] {
	const assignments: AssignmentValue[] = [];

	function processValue(value: IDataObject, path: Array<string | number> = []) {
		if (Array.isArray(value)) {
			value.forEach((element, index) => {
				processValue(element, [...path, index]);
			});
		} else if (isObject(value)) {
			for (const [key, objectValue] of Object.entries(value)) {
				processValue(objectValue as IDataObject, [...path, key]);
			}
		} else {
			const stringPath = path.reduce((fullPath: string, part) => {
				if (typeof part === 'number') {
					return `${fullPath}[${part}]`;
				}
				return `${fullPath}.${part}`;
			}, '$json');

			const expression = `={{ ${stringPath} }}`;
			assignments.push({
				id: uuid(),
				name: stringPath.replace('$json.', ''),
				value: expression,
				type: inferAssignmentType(value),
			});
		}
	}

	processValue(input);

	return assignments;
}
