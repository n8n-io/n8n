import { AuthenticatedRequest, WorkflowRepository } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';
import express from 'express';

import { NodeTypes } from '@/node-types';

type NodeBucket = 'internal' | 'external-known' | 'external-dynamic' | 'external-unverified';

interface ClassifiedNode {
	id: string;
	name: string;
	type: string;
	bucket: NodeBucket;
	vendor: string | null;
	destination: string | null;
}

interface ClassifiedEdge {
	from: string;
	to: string;
	port: string;
}

interface ClassifiedWorkflow {
	id: string;
	name: string;
	active: boolean;
	nodes: ClassifiedNode[];
	edges: ClassifiedEdge[];
}

// Triggers that receive data from outside the n8n process.
const INBOUND_EXTERNAL_TRIGGERS = new Set<string>([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'n8n-nodes-base.emailReadImap',
	'n8n-nodes-base.mqttTrigger',
	'n8n-nodes-base.amqpTrigger',
	'n8n-nodes-base.rabbitmqTrigger',
	'n8n-nodes-base.kafkaTrigger',
	'n8n-nodes-base.redisTrigger',
	'n8n-nodes-base.sseTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
]);

// Triggers that fire locally inside the n8n process (no external I/O on the trigger itself).
const LOCAL_TRIGGERS = new Set<string>([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.errorTrigger',
	'n8n-nodes-base.workflowTrigger',
	'n8n-nodes-base.start',
]);

const CODE_LIKE_TYPES = new Set<string>([
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);

const CODE_EXTERNAL_PATTERN =
	/\b(fetch|axios|https?:\/\/|require\(['"](?:http|https|net|dns|tls))/i;

const HTTP_TYPES = new Set<string>([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.httpRequestTool',
	'@n8n/n8n-nodes-langchain.toolHttpRequest',
]);

function vendorFromCredType(credType: string): string {
	return credType
		.replace(/OAuth2(Api)?$/i, '')
		.replace(/Api$/i, '')
		.replace(/Trigger$/i, '');
}

function vendorFromNodeType(type: string): string {
	const leaf = type.split('.').pop() ?? type;
	return leaf.replace(/Trigger$/i, '').replace(/Tool$/i, '');
}

@RestController('/visualizations')
export class VisualizationsController {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	/** Look up the node type and return its declared credential types (empty if none / unknown). */
	private declaredCredentials(type: string, version?: number): string[] {
		try {
			const nt = this.nodeTypes.getByNameAndVersion(type, version);
			const desc = nt.description;
			const creds = desc?.credentials ?? [];
			return creds.map((c) => c.name);
		} catch {
			return [];
		}
	}

	private classifyNode(node: {
		id?: string;
		name: string;
		type: string;
		typeVersion?: number;
		parameters?: Record<string, unknown>;
		credentials?: Record<string, unknown>;
	}): ClassifiedNode {
		const id = node.id ?? node.name;
		const params = node.parameters ?? {};
		const credsOnInstance = node.credentials ? Object.keys(node.credentials) : [];

		// 1. HTTP-style: classify by URL.
		if (HTTP_TYPES.has(node.type)) {
			const url = typeof params.url === 'string' ? params.url : '';
			if (url.startsWith('={{') || url.includes('{{')) {
				return {
					id,
					name: node.name,
					type: node.type,
					bucket: 'external-dynamic',
					vendor: null,
					destination: url,
				};
			}
			if (/^https?:\/\//i.test(url)) {
				const host = url.replace(/^https?:\/\//i, '').split('/')[0];
				return {
					id,
					name: node.name,
					type: node.type,
					bucket: 'external-known',
					vendor: host,
					destination: host,
				};
			}
			return {
				id,
				name: node.name,
				type: node.type,
				bucket: 'external-dynamic',
				vendor: null,
				destination: url || null,
			};
		}

		// 2. Code/Function: scan source for outbound calls.
		if (CODE_LIKE_TYPES.has(node.type)) {
			const body = [params.jsCode, params.pythonCode, params.functionCode, params.code]
				.filter((v): v is string => typeof v === 'string')
				.join('\n');
			if (CODE_EXTERNAL_PATTERN.test(body)) {
				return {
					id,
					name: node.name,
					type: node.type,
					bucket: 'external-unverified',
					vendor: 'code-egress',
					destination: null,
				};
			}
			return {
				id,
				name: node.name,
				type: node.type,
				bucket: 'internal',
				vendor: null,
				destination: null,
			};
		}

		// 3. Local trigger (manual/schedule/etc.) — internal.
		if (LOCAL_TRIGGERS.has(node.type)) {
			return {
				id,
				name: node.name,
				type: node.type,
				bucket: 'internal',
				vendor: null,
				destination: null,
			};
		}

		// 4. Inbound external trigger — counts as external (receives outside data).
		if (INBOUND_EXTERNAL_TRIGGERS.has(node.type)) {
			return {
				id,
				name: node.name,
				type: node.type,
				bucket: 'external-known',
				vendor: vendorFromNodeType(node.type),
				destination: 'inbound',
			};
		}

		// 5. Node has a credential reference on the workflow instance → external, vendor known.
		if (credsOnInstance.length > 0) {
			return {
				id,
				name: node.name,
				type: node.type,
				bucket: 'external-known',
				vendor: vendorFromCredType(credsOnInstance[0]),
				destination: null,
			};
		}

		// 6. Node-type registry declares any credentials → external.
		const declared = this.declaredCredentials(node.type, node.typeVersion);
		if (declared.length > 0) {
			return {
				id,
				name: node.name,
				type: node.type,
				bucket: 'external-known',
				vendor: vendorFromCredType(declared[0]),
				destination: null,
			};
		}

		// 7. Anything else assumed to be a pure local operation.
		return {
			id,
			name: node.name,
			type: node.type,
			bucket: 'internal',
			vendor: null,
			destination: null,
		};
	}

	private buildEdges(
		connections: Record<string, unknown>,
		nodeNameToId: Map<string, string>,
	): ClassifiedEdge[] {
		const edges: ClassifiedEdge[] = [];
		if (!connections) return edges;
		for (const [sourceName, ports] of Object.entries(connections)) {
			if (!ports || typeof ports !== 'object') continue;
			for (const [portName, portArr] of Object.entries(ports as Record<string, unknown>)) {
				if (!Array.isArray(portArr)) continue;
				for (const fanout of portArr) {
					if (!Array.isArray(fanout)) continue;
					for (const dest of fanout as Array<{ node: string }>) {
						if (!dest?.node) continue;
						const from = nodeNameToId.get(sourceName) ?? sourceName;
						const to = nodeNameToId.get(dest.node) ?? dest.node;
						edges.push({ from, to, port: portName });
					}
				}
			}
		}
		return edges;
	}

	@Get('/workflows')
	async getWorkflowGraphs(
		_req: AuthenticatedRequest,
		_res: express.Response,
	): Promise<ClassifiedWorkflow[]> {
		const workflows = await this.workflowRepository.find({
			select: ['id', 'name', 'activeVersionId', 'nodes', 'connections'],
		});

		return workflows.map((w) => {
			const rawNodes = Array.isArray(w.nodes) ? w.nodes : [];
			const nodes = rawNodes.map((n) =>
				this.classifyNode(n as Parameters<typeof this.classifyNode>[0]),
			);
			const nameToId = new Map<string, string>();
			rawNodes.forEach((n: { id?: string; name: string }) => {
				nameToId.set(n.name, n.id ?? n.name);
			});
			const edges = this.buildEdges((w.connections ?? {}) as Record<string, unknown>, nameToId);
			return {
				id: w.id,
				name: w.name,
				active: w.activeVersionId !== null,
				nodes,
				edges,
			};
		});
	}
}
