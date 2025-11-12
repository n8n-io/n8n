import * as prettier from 'prettier';

export interface NodeProperty {
	displayName: string;
	name: string;
	type: string;
	default?: any;
	required?: boolean;
	options?: Array<{
		name: string;
		value: string;
		description?: string;
		// Nested options for fixedCollection
		values?: NodeProperty[];
	}>;
	typeOptions?: {
		multipleValues?: boolean;
		loadOptionsMethod?: string;
		loadOptionsDependsOn?: string[];
		minValue?: number;
		maxValue?: number;
	};
	displayOptions?: {
		show?: Record<string, any[]>;
		hide?: Record<string, any[]>;
	};
	description?: string;
	placeholder?: string;
}

export interface NodeTypeDefinition {
	displayName: string;
	name: string;
	properties: NodeProperty[];
}

// Utility to convert kebab-case or snake_case to PascalCase
export function toPascalCase(str: string): string {
	return str
		.replace(/[-_.]/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

// Convert property name to valid TypeScript identifier
export function toValidPropertyName(name: string): string {
	// If name contains special characters or spaces, wrap in quotes
	if (/[^a-zA-Z0-9_$]/.test(name)) {
		return `"${name}"`;
	}
	return name;
}

// Generate TypeScript interface for fixedCollection nested properties
function generateFixedCollectionType(property: NodeProperty): string {
	if (!property.options || property.options.length === 0) {
		return 'Record<string, any>';
	}

	const collectionTypes: string[] = [];

	for (const option of property.options) {
		if (!option.values || option.values.length === 0) {
			continue;
		}

		const fieldName = option.value;
		let fieldsInterface = '{\n';

		for (const field of option.values) {
			const propName = toValidPropertyName(field.name);
			const propType = getTypeScriptType(field);
			const optional = !field.required ? '?' : '';
			const comment = field.description ? `   /** ${field.description} */\n` : '';

			fieldsInterface += `${comment}   ${propName}${optional}: ${propType};\n`;
		}

		fieldsInterface += ' }';

		// Check if this field can have multiple values
		const isMultiple = property.typeOptions?.multipleValues;
		const fieldType = isMultiple ? `Array<${fieldsInterface}>` : fieldsInterface;

		collectionTypes.push(` "${fieldName}"?: ${fieldType};`);
	}

	if (collectionTypes.length === 0) {
		return 'Record<string, any>';
	}

	return `{\n${collectionTypes.join('\n')}\n}`;
}

// Generate TypeScript interface for collection properties
function generateCollectionType(property: NodeProperty): string {
	if (!property.options || property.options.length === 0) {
		return 'Record<string, any>';
	}

	let fieldsInterface = '{\n';

	for (const option of property.options) {
		// Handle nested structures within collection
		let fieldType: string;
		if (option.values && option.values.length > 0) {
			// This is a nested structure - generate inline object type
			fieldType = '{\n';
			for (const nestedField of option.values) {
				const nestedPropName = toValidPropertyName(nestedField.name);
				const nestedPropType = getTypeScriptType(nestedField);
				const nestedOptional = !nestedField.required ? '?' : '';
				const nestedComment = nestedField.description
					? `   /** ${nestedField.description} */\n`
					: '';

				fieldType += `${nestedComment}   ${nestedPropName}${nestedOptional}: ${nestedPropType};\n`;
			}
			fieldType += ' }';
		} else {
			// Simple field - infer from the option
			fieldType = 'any';
		}

		const propName = toValidPropertyName(option.value);
		const comment = option.description ? ` /** ${option.description} */\n` : '';

		fieldsInterface += `${comment} ${propName}?: ${fieldType};\n`;
	}

	fieldsInterface += '}';

	return fieldsInterface;
}

// Escape special characters in string literals for TypeScript
function escapeStringLiteral(value: unknown): string {
	// Convert to string if not already
	const str = typeof value === 'string' ? value : String(value);
	return str
		.replace(/\\/g, '\\\\') // Escape backslashes first
		.replace(/"/g, '\\"') // Escape double quotes
		.replace(/\n/g, '\\n') // Escape newlines
		.replace(/\r/g, '\\r') // Escape carriage returns
		.replace(/\t/g, '\\t'); // Escape tabs
}

// Determine TypeScript type from n8n property type
export function getTypeScriptType(property: NodeProperty): string {
	const { type, options, typeOptions } = property;

	let baseType: string;

	switch (type) {
		case 'string':
			baseType = 'string';
			break;

		case 'number':
			baseType = 'number';
			break;

		case 'boolean':
			baseType = 'boolean';
			break;

		case 'dateTime':
			baseType = 'string | Date';
			break;

		case 'options':
			if (options && options.length > 0) {
				const values = options.map((opt) => `"${escapeStringLiteral(opt.value)}"`).join(' | ');
				baseType = values || 'string';
			} else {
				baseType = 'string';
			}
			break;

		case 'multiOptions':
			if (options && options.length > 0) {
				const values = options.map((opt) => `"${escapeStringLiteral(opt.value)}"`).join(' | ');
				baseType = `Array<${values}>`;
			} else {
				baseType = 'string[]';
			}
			break;

		case 'collection':
			baseType = generateCollectionType(property);
			break;

		case 'fixedCollection':
			baseType = generateFixedCollectionType(property);
			break;

		case 'json':
			baseType = 'string | object';
			break;

		case 'hidden':
			baseType = getDefaultType(property.default);
			break;

		default:
			baseType = 'any';
	}

	// Handle multipleValues typeOption for non-array types
	if (
		typeOptions?.multipleValues &&
		type !== 'multiOptions' &&
		type !== 'fixedCollection' &&
		!baseType.startsWith('Array<')
	) {
		return `Array<${baseType}>`;
	}

	return baseType;
}

// Get type from default value
export function getDefaultType(defaultValue: any): string {
	if (defaultValue === null || defaultValue === undefined) {
		return 'any';
	}

	const type = typeof defaultValue;
	if (type === 'object') {
		return Array.isArray(defaultValue) ? 'any[]' : 'Record<string, any>';
	}

	return type;
}

export function normalizeNodeName(nodeName: string): string {
	return nodeName.replace('n8n-nodes-base.', '').replace(/@n8n\/n8n-nodes-\w+\./, '');
}

// Generate TypeScript interface for a node's parameters
export function generateNodeParametersInterface(node: NodeTypeDefinition): string {
	const interfaceName = `${toPascalCase(normalizeNodeName(node.name))}Parameters`;

	// Group properties by their display conditions
	const baseProperties: NodeProperty[] = [];
	const conditionalProperties = new Map<string, NodeProperty[]>();

	for (const prop of node.properties) {
		// Skip properties with undefined type
		if (!prop.name || prop.type === undefined) {
			continue;
		}

		if (!prop.displayOptions?.show) {
			baseProperties.push(prop);
		} else {
			const conditionKey = JSON.stringify(prop.displayOptions.show);
			if (!conditionalProperties.has(conditionKey)) {
				conditionalProperties.set(conditionKey, []);
			}
			conditionalProperties.get(conditionKey)!.push(prop);
		}
	}

	let interfaceBody = '';

	// Track which property names we've already added within each scope
	const basePropertyNames = new Set<string>();

	// Add base properties
	for (const prop of baseProperties) {
		const propName = toValidPropertyName(prop.name);

		// Skip if we've already added this property in base scope
		if (basePropertyNames.has(prop.name)) {
			continue;
		}
		basePropertyNames.add(prop.name);

		const propType = getTypeScriptType(prop);
		const optional = !prop.required ? '?' : '';
		const comment = prop.description ? ` /** ${prop.description} */\n` : '';

		interfaceBody += `\n${comment} ${propName}${optional}: ${propType};\n`;
	}

	// Add conditional properties with comments
	for (const [condition, props] of conditionalProperties) {
		const parsedCondition = JSON.parse(condition);
		const conditionDesc = Object.entries(parsedCondition)
			.map(([key, values]) => `${key}: ${(values as any[]).join(', ')}`)
			.join(' AND ');

		// Track property names within this conditional block only
		const conditionPropertyNames = new Set<string>();
		let conditionHasProperties = false;
		let conditionBody = '';

		for (const prop of props) {
			// Skip if we've already added this property in this conditional block
			if (conditionPropertyNames.has(prop.name)) {
				continue;
			}
			conditionPropertyNames.add(prop.name);

			const propName = toValidPropertyName(prop.name);
			const propType = getTypeScriptType(prop);
			const optional = !prop.required ? '?' : '';
			const comment = prop.description ? ` /** ${prop.description} */\n` : '';

			conditionBody += `\n${comment} ${propName}${optional}: ${propType};\n`;
			conditionHasProperties = true;
		}

		// Only add the condition comment if there are properties under it
		if (conditionHasProperties) {
			interfaceBody += `\n // Properties shown when: ${conditionDesc}\n`;
			interfaceBody += conditionBody;
		}
	}

	return `export interface ${interfaceName} {\n${interfaceBody}}`;
}

// Generate operation-specific types
export function generateOperationTypes(node: NodeTypeDefinition): string[] {
	const types: string[] = [];

	// Find resource and operation properties
	const resourceProp = node.properties.find((p) => p.name === 'resource');
	const operationProp = node.properties.find((p) => p.name === 'operation');

	if (!resourceProp?.options || !operationProp) {
		return types;
	}

	const nodeName = toPascalCase(normalizeNodeName(node.name));

	// Generate types for each resource
	for (const resource of resourceProp.options) {
		const resourceName = toPascalCase(resource.value);

		// Find operations for this resource
		const operations = node.properties.filter(
			(p) => p.displayOptions?.show?.resource?.includes(resource.value) && p.name === 'operation',
		);

		if (operations.length === 0 && operationProp.options) {
			// Use global operations
			for (const op of operationProp.options) {
				const opName = toPascalCase(op.value);
				const typeName = `${nodeName}${resourceName}${opName}Parameters`;

				// Get all properties for this operation
				const opProperties = node.properties.filter(
					(p) =>
						p.name &&
						p.type !== undefined &&
						p.displayOptions?.show?.operation?.includes(op.value) &&
						p.displayOptions?.show?.resource?.includes(resource.value),
				);

				if (opProperties.length > 0) {
					// Track which property names we've already added to avoid duplicates
					const addedPropertyNames = new Set<string>();
					let interfaceBody = '';

					for (const prop of opProperties) {
						// Skip if we've already added this property
						if (addedPropertyNames.has(prop.name)) {
							continue;
						}
						addedPropertyNames.add(prop.name);

						const propName = toValidPropertyName(prop.name);
						const propType = getTypeScriptType(prop);
						const optional = !prop.required ? '?' : '';
						const comment = prop.description ? `\n  /** ${prop.description} */` : '';

						interfaceBody += `${comment}\n  ${propName}${optional}: ${propType};\n`;
					}

					types.push(
						`export interface ${typeName} {\n  resource: "${resource.value}";\n  operation: "${op.value}";\n${interfaceBody}}`,
					);
				}
			}
		}
	}

	return types;
}

// Main conversion function
export async function convertNodeToTypes(nodeDefinitions: NodeTypeDefinition[]): string {
	let output = '// Auto-generated n8n Node Parameter Types\n\n';

	const nodeTypeMappings: Array<{ nodeType: string; parameterType: string }> = [];

	for (const node of nodeDefinitions) {
		output += `// ${node.displayName}\n`;
		output += `// Node: ${node.name}\n\n`;

		// Generate main parameters interface
		const interfaceName = `${toPascalCase(normalizeNodeName(node.name))}Parameters`;
		output += generateNodeParametersInterface(node);
		output += '\n\n';

		// Store mapping for later
		nodeTypeMappings.push({ nodeType: node.name, parameterType: interfaceName });

		// Generate operation-specific types
		const operationTypes = generateOperationTypes(node);
		if (operationTypes.length > 0) {
			output += '// Operation-specific parameter types\n';
			output += operationTypes.join('\n\n');
			output += '\n\n';
		}

		output += '// ---\n\n';
	}

	// Generate NodeTypeToParametersMap
	if (nodeTypeMappings.length > 0) {
		output += '// Node Type to Parameters Mapping\n';
		output += 'export interface NodeTypeToParametersMap {\n';
		for (const mapping of nodeTypeMappings) {
			output += ` "${mapping.nodeType}": ${mapping.parameterType};\n`;
		}
		output += '}\n';
	}

	return await prettier.format(output, {
		parser: 'typescript',
		singleQuote: true,
		semi: true,
	});
}
