import { RuleTester } from '@typescript-eslint/rule-tester';

import { NodeFileConventionsRule } from './node-file-conventions.js';

const ruleTester = new RuleTester();

const validNodeFilePath = 'nodes/Github/Github.node.ts';
const validTriggerFilePath = 'nodes/GithubTrigger/GithubTrigger.node.ts';
const wrongFilenameFilePath = 'nodes/Github/github-node.ts';

function nodeClass(
	name: string,
	description = "{ name: 'github', displayName: 'GitHub' }",
): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ${name} implements INodeType {
	description: INodeTypeDescription = ${description};
}`;
}

function nonNodeClass(): string {
	return `
export class SomeHelper {
	doSomething() {}
}`;
}

ruleTester.run('node-file-conventions', NodeFileConventionsRule, {
	valid: [
		{
			name: 'valid node class and filename',
			filename: validNodeFilePath,
			code: nodeClass('Github'),
		},
		{
			name: 'valid trigger node class and filename',
			filename: validTriggerFilePath,
			code: nodeClass('GithubTrigger', "{ name: 'githubTrigger', displayName: 'GitHub Trigger' }"),
		},
		{
			name: 'non-node class is ignored',
			filename: 'nodes/SomeHelper/SomeHelper.node.ts',
			code: nonNodeClass(),
		},
	],
	invalid: [
		{
			name: 'node class with kebab-case filename',
			filename: wrongFilenameFilePath,
			code: nodeClass('Github'),
			errors: [{ messageId: 'filenameAgainstConvention' }],
		},
		{
			name: 'trigger node with displayName missing "Trigger"',
			filename: validTriggerFilePath,
			code: nodeClass('GithubTrigger', "{ name: 'githubTrigger', displayName: 'GitHub' }"),
			errors: [{ messageId: 'triggerDisplayNameUnsuffixed' }],
		},
		{
			name: 'trigger node with name missing "Trigger" suffix',
			filename: validTriggerFilePath,
			code: nodeClass('GithubTrigger', "{ name: 'github', displayName: 'GitHub Trigger' }"),
			errors: [{ messageId: 'triggerNameUnsuffixed' }],
		},
	],
});
