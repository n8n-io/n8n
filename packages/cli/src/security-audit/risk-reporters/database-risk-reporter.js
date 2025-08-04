'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.DatabaseRiskReporter = void 0;
const di_1 = require('@n8n/di');
const constants_1 = require('@/security-audit/constants');
const utils_1 = require('@/security-audit/utils');
let DatabaseRiskReporter = class DatabaseRiskReporter {
	async report(workflows) {
		const { expressionsInQueries, expressionsInQueryParams, unusedQueryParams } =
			this.getIssues(workflows);
		const issues = [expressionsInQueries, expressionsInQueryParams, unusedQueryParams];
		if (issues.every((i) => i.length === 0)) return null;
		const report = {
			risk: constants_1.DATABASE_REPORT.RISK,
			sections: [],
		};
		const sentenceStart = ({ length }) =>
			length > 1 ? 'These SQL nodes have' : 'This SQL node has';
		if (expressionsInQueries.length > 0) {
			report.sections.push({
				title: constants_1.DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERIES,
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
				title: constants_1.DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERY_PARAMS,
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
				title: constants_1.DATABASE_REPORT.SECTIONS.UNUSED_QUERY_PARAMS,
				description: [
					sentenceStart(unusedQueryParams),
					'no "Query Parameters" field in the "Execute Query" operation. Building a SQL query with unsanitized data may lead to a SQL injection attack.',
				].join(' '),
				recommendation: `Consider using the "Query Parameters" field to sanitize parameters passed to the query. See: ${constants_1.DB_QUERY_PARAMS_DOCS_URL}`,
				location: unusedQueryParams,
			});
		}
		return report;
	}
	getIssues(workflows) {
		return workflows.reduce(
			(acc, workflow) => {
				workflow.nodes.forEach((node) => {
					if (!constants_1.SQL_NODE_TYPES.has(node.type)) return;
					if (node.parameters === undefined) return;
					if (node.parameters.operation !== 'executeQuery') return;
					if (typeof node.parameters.query === 'string' && node.parameters.query.startsWith('=')) {
						acc.expressionsInQueries.push((0, utils_1.toFlaggedNode)({ node, workflow }));
					}
					if (!constants_1.SQL_NODE_TYPES_WITH_QUERY_PARAMS.has(node.type)) return;
					if (!node.parameters.additionalFields) {
						acc.unusedQueryParams.push((0, utils_1.toFlaggedNode)({ node, workflow }));
					}
					if (typeof node.parameters.additionalFields !== 'object') return;
					if (node.parameters.additionalFields === null) return;
					if (!('queryParams' in node.parameters.additionalFields)) {
						acc.unusedQueryParams.push((0, utils_1.toFlaggedNode)({ node, workflow }));
					}
					if (
						'queryParams' in node.parameters.additionalFields &&
						typeof node.parameters.additionalFields.queryParams === 'string' &&
						node.parameters.additionalFields.queryParams.startsWith('=')
					) {
						acc.expressionsInQueryParams.push((0, utils_1.toFlaggedNode)({ node, workflow }));
					}
				});
				return acc;
			},
			{ expressionsInQueries: [], expressionsInQueryParams: [], unusedQueryParams: [] },
		);
	}
};
exports.DatabaseRiskReporter = DatabaseRiskReporter;
exports.DatabaseRiskReporter = DatabaseRiskReporter = __decorate(
	[(0, di_1.Service)()],
	DatabaseRiskReporter,
);
//# sourceMappingURL=database-risk-reporter.js.map
