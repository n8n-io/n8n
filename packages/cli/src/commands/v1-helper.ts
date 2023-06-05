import { BaseCommand } from './BaseCommand';
import * as Db from '@/Db';

type Location = {
	workflowId: string;
	workflowName: string;
	active: boolean;
	nodeId: string;
	nodeName: string;
	parameterName: string;
};

function containsAny(str: string, substrings: string[]): boolean {
	for (const substring of substrings) {
		if (str.includes(substring)) return true;
	}

	return false;
}

const AFFECTED_EXTENSIONS = ['beginningOf', 'endOfMonth', 'minus', 'plus'];

const isExpression = (value: unknown): value is string =>
	typeof value === 'string' && value.startsWith('={{');

function findParamsByTest<T>(target: unknown, test: (element: T) => boolean): string[] {
	const parameterNames: string[] = [];

	function search(obj: unknown) {
		if (typeof obj === 'object') {
			for (const key in obj) {
				const value = obj[key as keyof typeof obj];

				if (test(value)) {
					parameterNames.push(key);
				} else if (typeof value === 'object') {
					search(value);
				}
			}
		}
	}

	search(target);

	return parameterNames;
}

export class V1Helper extends BaseCommand {
	static description = 'Report changes to be addressed when upgrading to n8n v1';

	static examples = ['$ n8n v1-helper'];

	async run() {
		const workflows = await Db.collections.Workflow.find({
			select: ['id', 'name', 'active', 'nodes'],
		});

		const isAffected = (value: unknown) =>
			isExpression(value) && containsAny(value, AFFECTED_EXTENSIONS);

		const locationsToReport = workflows.reduce<Location[]>((allLocations, workflow) => {
			if (workflow.nodes.length === 0) return allLocations;

			const perWorkflow = workflow.nodes.reduce<Location[]>((allLocationsPerWorkflow, node) => {
				if (!node.parameters) return allLocationsPerWorkflow;

				const perNode: Location[] = findParamsByTest(node.parameters, isAffected).map(
					(parameterName) => {
						return {
							workflowId: workflow.id,
							workflowName: workflow.name,
							active: workflow.active,
							nodeId: node.id,
							nodeName: node.name,
							parameterName,
						};
					},
				);

				return [...allLocationsPerWorkflow, ...perNode];
			}, []);

			return [...allLocations, ...perWorkflow];
		}, []);

		console.info(
			'The following parameters contain expression extensions affected by breaking changes in v1. Please update the expressions in these parameters immediately after upgrading to v1.',
		);

		console.info(locationsToReport);
	}

	async catch(error: Error) {
		this.logger.error('Failed to report changes to be addressed before migrating to n8n v1');
		this.logger.error(error.message);
	}
}
