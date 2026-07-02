// Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment
import { InstanceAiExamplesQueryDto } from '@n8n/api-types';
import { Get, Query, RestController } from '@n8n/decorators';
import path from 'node:path';
import { readFileSync } from 'node:fs';

interface ExampleNode {
	name: string;
	displayName?: string;
	icon?: string;
	iconData?: { type: string; fileBuffer?: string; icon?: string };
}

interface ExampleWorkflow {
	id: number;
	name: string;
	category: string;
	subcategory?: string;
	relevanceScore?: number;
	prompt?: string;
	nodes: ExampleNode[];
}

interface RawExamplesData {
	categories: string[];
	subcategories: Record<string, string[]>;
	nodeIcons: Record<string, { type: string; fileBuffer?: string; icon?: string }>;
	totalWorkflows: number;
	workflows: ExampleWorkflow[];
}

interface ExamplesData {
	categories: string[];
	subcategories: Record<string, string[]>;
	totalWorkflows: number;
	workflows: ExampleWorkflow[];
}

const NATIVE_NODE_PREFIXES = ['@n8n/n8n-nodes-langchain.'];
const NATIVE_NODES = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.html',
	'n8n-nodes-base.crypto',
	'n8n-nodes-base.editImage',
	'n8n-nodes-base.ftp',
	'n8n-nodes-base.evaluation',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.sms77',
	'n8n-nodes-base.apiTemplateIo',
]);

function hasVisibleNodes(nodes: ExampleNode[]): boolean {
	return nodes.some(
		(n) => !NATIVE_NODES.has(n.name) && !NATIVE_NODE_PREFIXES.some((p) => n.name.startsWith(p)),
	);
}

@RestController('/instance-ai-examples')
export class InstanceAiExamplesController {
	private cachedData: ExamplesData | null = null;

	@Get('/')
	getExamples(_req: unknown, _res: unknown, @Query query: InstanceAiExamplesQueryDto) {
		const data = this.loadData();
		const { category, subcategory, page, limit } = query;

		let workflows = data.workflows;

		if (category) {
			workflows = workflows.filter((w) => w.category === category);
		}
		if (subcategory) {
			workflows = workflows.filter((w) => w.subcategory === subcategory);
		}

		workflows.sort((a, b) => {
			const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
			if (scoreDiff !== 0) return scoreDiff;
			const aVisible = hasVisibleNodes(a.nodes) ? 1 : 0;
			const bVisible = hasVisibleNodes(b.nodes) ? 1 : 0;
			return bVisible - aVisible;
		});

		const totalWorkflows = workflows.length;
		const offset = (page - 1) * limit;
		const paginatedWorkflows = workflows.slice(offset, offset + limit);

		return {
			categories: data.categories,
			subcategories: data.subcategories,
			totalWorkflows,
			workflows: paginatedWorkflows,
		};
	}

	private loadData(): ExamplesData {
		if (!this.cachedData) {
			const filePath = path.resolve(
				__dirname,
				'..',
				'..',
				'..',
				'frontend',
				'editor-ui',
				'src',
				'experiments',
				'instanceAiTemplateExamples',
				'instance-ai-examples.data.json',
			);
			const raw = readFileSync(filePath, 'utf-8');
			const rawData = JSON.parse(raw) as RawExamplesData;

			const workflows: ExampleWorkflow[] = rawData.workflows.map((w) => ({
				...w,
				nodes: w.nodes.map((n) => ({
					...n,
					iconData: rawData.nodeIcons[n.name],
				})),
			}));

			this.cachedData = {
				categories: rawData.categories,
				subcategories: rawData.subcategories,
				totalWorkflows: rawData.totalWorkflows,
				workflows,
			};
		}
		return this.cachedData!;
	}
}
