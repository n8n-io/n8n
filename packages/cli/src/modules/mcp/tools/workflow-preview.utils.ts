import type {
	PreviewWorkflowConnections,
	PreviewWorkflowNode,
	PreviewWorkflowNodeDisplay,
	PreviewWorkflowNodeIcon,
	PreviewWorkflowOutput,
} from '@n8n/mcp-apps/server';
import { readFile } from 'fs/promises';
import type { IConnections, INode, INodeTypeDescription } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';

const STICKY_NOTE_NODE_TYPE = 'n8n-nodes-base.stickyNote';
const DEFAULT_STICKY_NOTE_WIDTH = 240;
const DEFAULT_STICKY_NOTE_HEIGHT = 160;
const MIN_STICKY_NOTE_WIDTH = 120;
const MAX_STICKY_NOTE_WIDTH = 1200;
const MIN_STICKY_NOTE_HEIGHT = 80;
const MAX_STICKY_NOTE_HEIGHT = 800;

type PreviewWorkflowSource = {
	id: string;
	name: string;
	nodes?: INode[];
	connections?: IConnections;
};

type BuildPreviewWorkflowOutputOptions = {
	workflow: PreviewWorkflowSource;
	instanceBaseUrl: string;
	workflowUrl?: string;
	nodeTypes: NodeTypes;
	loadNodesAndCredentials?: LoadNodesAndCredentials;
	nodeExecutionStatuses?: Map<string, PreviewWorkflowNode['executionStatus']>;
	execution?: PreviewWorkflowOutput['execution'];
};

export async function buildPreviewWorkflowOutput({
	workflow,
	instanceBaseUrl,
	workflowUrl,
	nodeTypes,
	loadNodesAndCredentials,
	nodeExecutionStatuses,
	execution,
}: BuildPreviewWorkflowOutputOptions): Promise<PreviewWorkflowOutput> {
	return {
		workflowId: workflow.id,
		workflowUrl: workflowUrl ?? buildWorkflowUrl(instanceBaseUrl, workflow.id),
		name: workflow.name,
		...(execution ? { execution } : {}),
		nodes: await Promise.all(
			(workflow.nodes ?? []).map(async ({ name, type, typeVersion, position, parameters }) => {
				const display = getNodeDisplay(type, parameters);
				const executionStatus = nodeExecutionStatuses?.get(name);

				return {
					name,
					type,
					icon: await resolveNodeIcon(
						type,
						typeVersion,
						nodeTypes,
						instanceBaseUrl,
						loadNodesAndCredentials,
					),
					...(display ? { display } : {}),
					...(executionStatus ? { executionStatus } : {}),
					position: normalizePosition(position),
				};
			}),
		),
		connections: sanitizeConnections(workflow.connections ?? {}),
	};
}

export function buildWorkflowUrl(instanceBaseUrl: string, workflowId: string): string {
	return `${instanceBaseUrl.replace(/\/$/, '')}/workflow/${encodeURIComponent(workflowId)}`;
}

export function buildExecutionUrl(
	instanceBaseUrl: string,
	workflowId: string,
	executionId: string,
): string {
	return `${buildWorkflowUrl(instanceBaseUrl, workflowId)}/executions/${encodeURIComponent(
		executionId,
	)}`;
}

async function resolveNodeIcon(
	nodeTypeName: string,
	nodeTypeVersion: INode['typeVersion'],
	nodeTypes: NodeTypes,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): Promise<PreviewWorkflowNodeIcon> {
	try {
		const { description } = nodeTypes.getByNameAndVersion(nodeTypeName, nodeTypeVersion);
		const icon = await resolveNodeDescriptionIcon(
			description,
			instanceBaseUrl,
			loadNodesAndCredentials,
		);
		return icon;
	} catch {
		return { type: 'unknown' };
	}
}

async function resolveNodeDescriptionIcon(
	description: INodeTypeDescription,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): Promise<PreviewWorkflowNodeIcon> {
	const iconUrl = getThemedValue(description.iconUrl);
	if (iconUrl) return resolveFileIcon(iconUrl, instanceBaseUrl, loadNodesAndCredentials);

	const icon = getThemedValue(description.icon);
	if (!icon) return { type: 'unknown' };

	const [iconType, iconName] = splitIconReference(icon);
	if (iconType === 'file') {
		if (!description.iconBasePath) return { type: 'unknown' };

		const iconPath = iconName.replace(/^\//, '');
		return resolveFileIcon(
			`${description.iconBasePath}/${iconPath}`,
			instanceBaseUrl,
			loadNodesAndCredentials,
		);
	}

	if (iconType === 'icon' || iconType === 'node' || iconType === 'fa') {
		return {
			type: 'icon',
			name: icon,
			color: description.iconColor ?? description.defaults?.color,
		};
	}

	return { type: 'unknown' };
}

async function resolveFileIcon(
	iconPath: string,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): Promise<PreviewWorkflowNodeIcon> {
	const inlineSrc = await resolveInlineIcon(iconPath, loadNodesAndCredentials);

	return {
		type: 'file',
		src: inlineSrc ?? prefixInstanceBaseUrl(iconPath, instanceBaseUrl),
	};
}

async function resolveInlineIcon(
	iconPath: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): Promise<string | undefined> {
	if (
		!loadNodesAndCredentials ||
		/^(https?:)?\/\//.test(iconPath) ||
		iconPath.startsWith('data:')
	) {
		return undefined;
	}

	const iconRoute = getIconRoute(iconPath);
	if (!iconRoute) return undefined;

	const filePath = loadNodesAndCredentials.resolveIcon(iconRoute.packageName, iconRoute.path);
	if (!filePath) return undefined;

	try {
		const contents = await readFile(filePath);
		const mimeType = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/svg+xml';

		return `data:${mimeType};base64,${contents.toString('base64')}`;
	} catch {
		return undefined;
	}
}

function getIconRoute(iconPath: string): { packageName: string; path: string } | undefined {
	const path = (iconPath.startsWith('/') ? iconPath : `/${iconPath}`).split(/[?#]/)[0];
	const match = /^\/icons\/((?:@[^/]+\/)?[^/]+)\//.exec(path);
	if (!match) return undefined;

	return { packageName: match[1], path };
}

function getThemedValue(value: INodeTypeDescription['icon']): string | undefined;
function getThemedValue(value: INodeTypeDescription['iconUrl']): string | undefined;
function getThemedValue(value: INodeTypeDescription['icon'] | INodeTypeDescription['iconUrl']) {
	if (!value) return undefined;
	if (typeof value === 'string') return value;

	return value.light;
}

function splitIconReference(icon: string): [string, string] {
	const separatorIndex = icon.indexOf(':');
	if (separatorIndex === -1) return ['', ''];

	return [icon.slice(0, separatorIndex), icon.slice(separatorIndex + 1)];
}

function prefixInstanceBaseUrl(path: string, instanceBaseUrl: string): string {
	if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;

	const normalizedBaseUrl = instanceBaseUrl.replace(/\/$/, '');
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	return `${normalizedBaseUrl}${normalizedPath}`;
}

function getNodeDisplay(
	type: string,
	parameters: INode['parameters'],
): PreviewWorkflowNodeDisplay | undefined {
	if (type !== STICKY_NOTE_NODE_TYPE) return undefined;

	const display: PreviewWorkflowNodeDisplay = {
		variant: 'stickyNote',
		width: normalizeDimension(
			parameters?.width,
			DEFAULT_STICKY_NOTE_WIDTH,
			MIN_STICKY_NOTE_WIDTH,
			MAX_STICKY_NOTE_WIDTH,
		),
		height: normalizeDimension(
			parameters?.height,
			DEFAULT_STICKY_NOTE_HEIGHT,
			MIN_STICKY_NOTE_HEIGHT,
			MAX_STICKY_NOTE_HEIGHT,
		),
	};
	const content = normalizeString(parameters?.content);
	const color = normalizeInteger(parameters?.color, 1, 7);

	if (content) display.content = content;
	if (color !== undefined) display.color = color;

	return display;
}

function normalizeDimension(value: unknown, fallback: number, min: number, max: number) {
	const number =
		typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	if (!Number.isFinite(number)) return fallback;

	return Math.min(Math.max(number, min), max);
}

function normalizeInteger(value: unknown, min: number, max: number) {
	const number =
		typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	if (!Number.isFinite(number)) return undefined;

	return Math.min(Math.max(Math.round(number), min), max);
}

function normalizeString(value: unknown) {
	return typeof value === 'string' ? value : undefined;
}

function normalizePosition(position: INode['position']): [number, number] {
	const [x, y] = position;
	return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
}

function sanitizeConnections(connections: IConnections): PreviewWorkflowConnections {
	const sanitized: PreviewWorkflowConnections = {};

	for (const [sourceNodeName, outputsByType] of Object.entries(connections)) {
		sanitized[sourceNodeName] = {};

		for (const [connectionType, outputGroups] of Object.entries(outputsByType)) {
			sanitized[sourceNodeName][connectionType] = outputGroups.map(
				(connectionsForOutput) =>
					connectionsForOutput?.map(({ node, type, index }) => ({ node, type, index })) ?? null,
			);
		}
	}

	return sanitized;
}
