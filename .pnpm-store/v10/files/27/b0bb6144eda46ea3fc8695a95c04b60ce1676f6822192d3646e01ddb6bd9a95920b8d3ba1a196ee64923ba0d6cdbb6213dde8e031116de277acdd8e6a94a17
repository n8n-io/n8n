import {execPath, execArgv} from 'node:process';
import path from 'node:path';
import {safeNormalizeFileUrl} from '../arguments/file-url.js';

// `execaNode()` is a shortcut for `execa(..., {node: true})`
export const mapNode = ({options}) => {
	if (options.node === false) {
		throw new TypeError('The "node" option cannot be false with `execaNode()`.');
	}

	return {options: {...options, node: true}};
};

// Applies the `node: true` option, and the related `nodePath`/`nodeOptions` options.
// Modifies the file commands/arguments to ensure the same Node binary and flags are re-used.
// Also adds `ipc: true` and `shell: false`.
export const handleNodeOption = (file, commandArguments, {
	node: shouldHandleNode = false,
	nodePath = execPath,
	nodeOptions = execArgv.filter(nodeOption => !nodeOption.startsWith('--inspect')),
	cwd,
	execPath: formerNodePath,
	...options
}) => {
	if (formerNodePath !== undefined) {
		throw new TypeError('The "execPath" option has been removed. Please use the "nodePath" option instead.');
	}

	const normalizedNodePath = safeNormalizeFileUrl(nodePath, 'The "nodePath" option');
	const resolvedNodePath = path.resolve(cwd, normalizedNodePath);
	const newOptions = {
		...options,
		nodePath: resolvedNodePath,
		node: shouldHandleNode,
		cwd,
	};

	if (!shouldHandleNode) {
		return [file, commandArguments, newOptions];
	}

	if (path.basename(file, '.exe') === 'node') {
		throw new TypeError('When the "node" option is true, the first argument does not need to be "node".');
	}

	return [
		resolvedNodePath,
		[...nodeOptions, file, ...commandArguments],
		{ipc: true, ...newOptions, shell: false},
	];
};
