import type { CredentialsEntity } from '@n8n/db';
import {
	type DisplayCondition,
	type IDataObject,
	type INodeProperties,
	type INodePropertyOptions,
} from 'n8n-workflow';

import type { IDependency, IJsonSchema } from '../../../types';

function isNodePropertyOptions(options: unknown): options is INodePropertyOptions[] {
	return (
		Array.isArray(options) &&
		options.every(
			(item) => typeof item === 'object' && item !== null && 'value' in item && 'name' in item,
		)
	);
}

/**
 * Shared entry for credential list: project id/name plus sharing role and timestamps.
 * Derived from credential.shared (SharedCredentials + Project), limited to these fields.
 */
export type CredentialListSharedItem = {
	id: string;
	name: string;
	role: string;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * Build the shared array for a credential list item from credential.shared.
 * Each entry has id, name from the project and role, createdAt, updatedAt from the shared relation.
 */
export function buildSharedForCredential(
	credential: CredentialsEntity,
): CredentialListSharedItem[] {
	const shared = credential.shared;
	return shared
		.filter((sh) => typeof sh.project?.id === 'string')
		.map((sh) => ({
			id: sh.project.id,
			name: sh.project.name,
			role: sh.role,
			createdAt: sh.createdAt,
			updatedAt: sh.updatedAt,
		}));
}

export function sanitizeCredentials(credential: CredentialsEntity): Partial<CredentialsEntity> {
	const { data, shared, ...rest } = credential;
	return rest;
}

/**
 * toJsonSchema
 * Take an array of credentials parameter and map it
 * to a JSON Schema (see https://json-schema.org/). With
 * the JSON Schema definition we can validate the credential's shape
 * @param properties - Credentials properties
 */
export function toJsonSchema(properties: INodeProperties[]): IDataObject {
	const jsonSchema: IJsonSchema = {
		additionalProperties: false,
		type: 'object',
		properties: {},
		allOf: [],
		required: [],
	};

	const optionsValues: { [key: string]: string[] } = {};
	const resolveProperties: string[] = [];

	// get all possible values of properties type "options"
	// so we can later resolve the displayOptions dependencies
	properties
		.filter((property) => property.type === 'options')
		.forEach((property) => {
			Object.assign(optionsValues, {
				[property.name]: isNodePropertyOptions(property.options)
					? property.options.map((option) => option.value)
					: undefined,
			});
		});

	let requiredFields: string[] = [];

	const propertyRequiredDependencies: { [key: string]: IDependency } = {};

	// add all credential's properties to the properties
	// object in the JSON Schema definition. This allows us
	// to later validate that only this properties are set in
	// the credentials sent in the API call.
	// eslint-disable-next-line complexity
	properties.forEach((property) => {
		if (property.required) {
			requiredFields.push(property.name);
		}
		if (property.type === 'options') {
			// if the property is type options,
			// include all possible values in the enum property.
			Object.assign(jsonSchema.properties, {
				[property.name]: {
					type: 'string',
					enum: isNodePropertyOptions(property.options)
						? property.options.map((data) => data.value)
						: undefined,
				},
			});
		} else {
			Object.assign(jsonSchema.properties, {
				[property.name]: {
					type: property.type,
				},
			});
		}

		// if the credential property has a dependency
		// then add a JSON Schema condition that satisfy each property value
		// e.x: If A has value X then required B, else required C
		// see https://json-schema.org/understanding-json-schema/reference/conditionals.html#if-then-else
		if (property.displayOptions?.show) {
			const dependantName = Object.keys(property.displayOptions?.show)[0] || '';
			const displayOptionsValues = property.displayOptions.show[dependantName];
			let dependantValue: DisplayCondition | string | number | boolean = '';

			if (
				displayOptionsValues &&
				Array.isArray(displayOptionsValues) &&
				displayOptionsValues[0] !== undefined &&
				displayOptionsValues[0] !== null
			) {
				dependantValue = displayOptionsValues[0];
			}

			// Create a unique key for each dependant name and value combination
			// so that if multiple properties depend on the same property but different values
			// they get their own if-then-else block
			const dependencyKey = `${dependantName}:${JSON.stringify(dependantValue)}`;

			if (!resolveProperties.includes(dependencyKey)) {
				let conditionalValue;
				if (typeof dependantValue === 'object' && dependantValue._cnd) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const [key, targetValue] = Object.entries(dependantValue._cnd)[0];

					if (key === 'eq') {
						conditionalValue = {
							const: [targetValue],
						};
					} else if (key === 'not') {
						conditionalValue = {
							not: {
								const: [targetValue],
							},
						};
					} else if (key === 'gt') {
						conditionalValue = {
							type: 'number',
							exclusiveMinimum: [targetValue],
						};
					} else if (key === 'gte') {
						conditionalValue = {
							type: 'number',
							minimum: [targetValue],
						};
					} else if (key === 'lt') {
						conditionalValue = {
							type: 'number',
							exclusiveMaximum: [targetValue],
						};
					} else if (key === 'lte') {
						conditionalValue = {
							type: 'number',
							maximum: [targetValue],
						};
					} else if (key === 'startsWith') {
						conditionalValue = {
							type: 'string',
							pattern: `^${targetValue}`,
						};
					} else if (key === 'endsWith') {
						conditionalValue = {
							type: 'string',
							pattern: `${targetValue}$`,
						};
					} else if (key === 'includes') {
						conditionalValue = {
							type: 'string',
							pattern: `${targetValue}`,
						};
					} else if (key === 'regex') {
						conditionalValue = {
							type: 'string',
							pattern: `${targetValue}`,
						};
					} else {
						conditionalValue = {
							enum: [dependantValue],
						};
					}
				} else {
					conditionalValue = {
						enum: [dependantValue],
					};
				}
				propertyRequiredDependencies[dependencyKey] = {
					if: {
						properties: {
							[dependantName]: conditionalValue,
						},
						// Require the controlling field in the `if` so the condition only
						// matches when it is actually present and equal. Without this, an
						// absent controlling field makes `properties` vacuously true and the
						// `then` block would fire unexpectedly.
						required: [dependantName],
					},
					then: {
						allOf: [],
					},
				};
				resolveProperties.push(dependencyKey);
			}

			// Only enforce a field as required when the credential actually marks it `required`.
			if (property.required) {
				propertyRequiredDependencies[dependencyKey].then?.allOf.push({
					required: [property.name],
				});
			}
			// Requiredness is now conditional, so drop it from the global required list.
			requiredFields = requiredFields.filter((field) => field !== property.name);
		}
	});
	Object.assign(jsonSchema, { required: requiredFields });

	// Drop conditionals that ended up with no required fields, so credentials whose
	// conditional fields are all optional produce no `allOf` constraints.
	jsonSchema.allOf = Object.values(propertyRequiredDependencies).filter(
		(dependency) => (dependency.then?.allOf.length ?? 0) > 0,
	);

	if (!jsonSchema.allOf.length) {
		delete jsonSchema.allOf;
	}

	return jsonSchema as unknown as IDataObject;
}
