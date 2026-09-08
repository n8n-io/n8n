import { RuleTester } from '@typescript-eslint/rule-tester';

import { TriggerNodeConventionsRule } from './trigger-node-conventions.js';

const ruleTester = new RuleTester();

function createNodeCode(options: {
	className: string;
	name: string;
	displayName: string;
	inputs: string;
}): string {
	const { className, name, displayName, inputs } = options;
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ${className} implements INodeType {
  description: INodeTypeDescription = {
    displayName: '${displayName}',
    name: '${name}',
    group: ['trigger'],
    version: 1,
    description: 'A test node',
    defaults: { name: '${displayName}' },
    inputs: ${inputs},
    outputs: ['main'],
    properties: [],
  };
}`;
}

/** `description = { … } as INodeTypeDescription` — a widely used node layout. */
function createTypeAssertedNodeCode(options: {
	className: string;
	name: string;
	displayName: string;
	inputs: string;
}): string {
	const { className, name, displayName, inputs } = options;
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ${className} implements INodeType {
  description = {
    displayName: '${displayName}',
    name: '${name}',
    group: ['trigger'],
    version: 1,
    description: 'A test node',
    defaults: { name: '${displayName}' },
    inputs: ${inputs},
    outputs: ['main'],
    properties: [],
  } as INodeTypeDescription;
}`;
}

/**
 * Versioned node layout from the node-building docs: the version class assigns
 * `description` in its constructor instead of as a property initializer.
 */
function createVersionedNodeCode(options: {
	className: string;
	name: string;
	displayName: string;
	inputs: string;
}): string {
	const { className, name, displayName, inputs } = options;
	return `
import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';

export class ${className} implements INodeType {
  description: INodeTypeDescription;

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      displayName: '${displayName}',
      name: '${name}',
      group: ['trigger'],
      version: 1,
      description: 'A test node',
      defaults: { name: '${displayName}' },
      inputs: ${inputs},
      outputs: ['main'],
      properties: [],
    };
  }
}`;
}

ruleTester.run('trigger-node-conventions', TriggerNodeConventionsRule, {
	valid: [
		{
			name: 'class that does not implement INodeType',
			filename: 'MyTrigger.node.ts',
			code: 'export class MyTrigger {}',
		},
		{
			name: 'non-trigger node class is ignored',
			filename: 'My.node.ts',
			code: createNodeCode({
				className: 'My',
				name: 'my',
				displayName: 'My Node',
				inputs: "['main']",
			}),
		},
		{
			name: 'compliant trigger node',
			filename: 'MyTrigger.node.ts',
			code: createNodeCode({
				className: 'MyTrigger',
				name: 'myTrigger',
				displayName: 'My Trigger',
				inputs: '[]',
			}),
		},
	],
	invalid: [
		{
			name: 'name missing Trigger suffix',
			filename: 'MyTrigger.node.ts',
			code: createNodeCode({
				className: 'MyTrigger',
				name: 'my',
				displayName: 'My Trigger',
				inputs: '[]',
			}),
			errors: [{ messageId: 'nameMissingSuffix', data: { value: 'my' } }],
		},
		{
			name: 'displayName missing Trigger',
			filename: 'MyTrigger.node.ts',
			code: createNodeCode({
				className: 'MyTrigger',
				name: 'myTrigger',
				displayName: 'My Node',
				inputs: '[]',
			}),
			errors: [{ messageId: 'displayNameMissingTrigger', data: { value: 'My Node' } }],
		},
		{
			name: 'inputs is not empty',
			filename: 'MyTrigger.node.ts',
			code: createNodeCode({
				className: 'MyTrigger',
				name: 'myTrigger',
				displayName: 'My Trigger',
				inputs: "['main']",
			}),
			errors: [{ messageId: 'inputsNotEmpty' }],
		},
		{
			name: 'all three violations at once',
			filename: 'MyTrigger.node.ts',
			code: createNodeCode({
				className: 'MyTrigger',
				name: 'my',
				displayName: 'My Node',
				inputs: "['main']",
			}),
			errors: [
				{ messageId: 'displayNameMissingTrigger' },
				{ messageId: 'nameMissingSuffix' },
				{ messageId: 'inputsNotEmpty' },
			],
		},
		{
			name: 'type-asserted description with name missing Trigger suffix',
			filename: 'MyTrigger.node.ts',
			code: createTypeAssertedNodeCode({
				className: 'MyTrigger',
				name: 'my',
				displayName: 'My Trigger',
				inputs: '[]',
			}),
			errors: [{ messageId: 'nameMissingSuffix', data: { value: 'my' } }],
		},
		{
			name: 'versioned node assigning description in its constructor with name missing Trigger suffix',
			filename: 'MyTriggerV1.node.ts',
			code: createVersionedNodeCode({
				className: 'MyTrigger',
				name: 'my',
				displayName: 'My Trigger',
				inputs: '[]',
			}),
			errors: [{ messageId: 'nameMissingSuffix', data: { value: 'my' } }],
		},
	],
});
