import { nodeIconSet, type NodeIconName } from './generated/node-icons';

export { nodeIconSet, type NodeIconName };

export function isNodeIconName(name?: string): name is NodeIconName {
	return typeof name === 'string' && name in nodeIconSet;
}

export function getNodeIconSvg(name: string): string | undefined {
	return isNodeIconName(name) ? nodeIconSet[name] : undefined;
}
