/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-var-requires */
import { INodeType, Workflow } from 'n8n-workflow';
import path from 'path';

type NodeModule = {
	[className: string]: new () => { methods: { [key: string]: { [key: string]: Function } } };
};

function getVersionedNodeFilePath(sourcePath: string, version: number | number[]) {
	if (Array.isArray(version)) return sourcePath;

	const { dir, base } = path.parse(sourcePath);
	const versionedNodeFilename = base.replace('.node.js', `V${version}.node.js`);

	return path.resolve(dir, `v${version}`, versionedNodeFilename);
}

export function requireDistNode(nodeType: INodeType, workflow: Workflow) {
	const sourcePath = workflow.nodeTypes.getSourcePath(nodeType.description.name);

	const nodeFilePath =
		nodeType.description.defaultVersion !== undefined
			? getVersionedNodeFilePath(sourcePath, nodeType.description.version)
			: sourcePath;

	let _module;

	try {
		_module = require(nodeFilePath) as NodeModule;
	} catch (_) {
		throw new Error(`Failed to require node at ${sourcePath}`);
	}

	const _className = nodeFilePath.split('/').pop()?.split('.').shift();

	if (!_className) {
		throw new Error(`Failed to find class in node at ${nodeFilePath}`);
	}

	try {
		return new _module[_className]();
	} catch (error) {
		throw new Error(`Failed to instantiate node at ${sourcePath}`);
	}
}
