import { Service } from '@n8n/di';
import type { IWorkflowBase } from 'n8n-workflow';

import {
	SQL_NODE_TYPES,
	DATABASE_REPORT,
	DB_QUERY_PARAMS_DOCS_URL,
	SQL_NODE_TYPES_WITH_QUERY_PARAMS,
} from '@/security-audit/constants';
import type { RiskReporter, Risk } from '@/security-audit/types';
import { toFlaggedNode } from '@/security-audit/utils';

@Service()
export class DatabaseRiskReporter implements RiskReporter {
	async report(workflows: IWorkflowBase[]) {
		const { expressionsInQueries, expressionsInQueryParams, unusedQueryParams } =
			this.getIssues(workflows);

		const issues = [expressionsInQueries, expressionsInQueryParams, unusedQueryParams];

		if (issues.every((i) => i.length === 0)) return null;

		const report: Risk.StandardReport = {
			risk: DATABASE_REPORT.RISK,
			sections: [],
		};

		const sentenceStart = ({ length }: { length: number }) =>
			length > 1 ? 'These SQL nodes have' : 'This SQL node has';

		if (expressionsInQueries.length > 0) {
			report.sections.push({
				title: DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERIES,
				description: [
					sentenceStart(expressionsInQueries),
					'an expression in the "Query" field of an "Execute Query" operation. Building a SQL query with an expression may lead to a SQL injection attack.',
				].join(' '),
				recommendation:
					'Consider using the "Query Parameters" field to pass parameters to the query, or validating the input of the expression in the "Query" field.',
				location: expressionsInQueries,
			});
		}

		if (expressionsInQueryParams.length > 0) {
			report.sections.push({
				title: DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERY_PARAMS,
				description: [
					sentenceStart(expressionsInQueryParams),
					'an expression in the "Query Parameters" field of an "Execute Query" operation. Building a SQL query with an expression may lead to a SQL injection attack.',
				].join(' '),
				recommendation:
					'Consider validating the input of the expression in the "Query Parameters" field.',
				location: expressionsInQueryParams,
			});
		}

		if (unusedQueryParams.length > 0) {
			report.sections.push({
				title: DATABASE_REPORT.SECTIONS.UNUSED_QUERY_PARAMS,
				description: [
					sentenceStart(unusedQueryParams),
					'no "Query Parameters" field in the "Execute Query" operation. Building a SQL query with unsanitized data may lead to a SQL injection attack.',
				].join(' '),
				recommendation: `Consider using the "Query Parameters" field to sanitize parameters passed to the query. See: ${DB_QUERY_PARAMS_DOCS_URL}`,
				location: unusedQueryParams,
			});
		}

		return report;
	}

	private getIssues(workflows: IWorkflowBase[]) {
		return workflows.reduce<{ [sectionTitle: string]: Risk.NodeLocation[] }>(
			(acc, workflow) => {
				workflow.nodes.forEach((node) => {
					if (!SQL_NODE_TYPES.has(node.type)) return;
					if (node.parameters === undefined) return;
					if (node.parameters.operation !== 'executeQuery') return;

					if (typeof node.parameters.query === 'string' && node.parameters.query.startsWith('=')) {
						acc.expressionsInQueries.push(toFlaggedNode({ node, workflow }));
					}

					if (!SQL_NODE_TYPES_WITH_QUERY_PARAMS.has(node.type)) return;

					if (!node.parameters.additionalFields) {
						acc.unusedQueryParams.push(toFlaggedNode({ node, workflow }));
					}

					if (typeof node.parameters.additionalFields !== 'object') return;
					if (node.parameters.additionalFields === null) return;

					if (!('queryParams' in node.parameters.additionalFields)) {
						acc.unusedQueryParams.push(toFlaggedNode({ node, workflow }));
					}

					if (
						'queryParams' in node.parameters.additionalFields &&
						typeof node.parameters.additionalFields.queryParams === 'string' &&
						node.parameters.additionalFields.queryParams.startsWith('=')
					) {
						acc.expressionsInQueryParams.push(toFlaggedNode({ node, workflow }));
					}
				});

				return acc;
			},
			{ expressionsInQueries: [], expressionsInQueryParams: [], unusedQueryParams: [] },
		);
	}
}
