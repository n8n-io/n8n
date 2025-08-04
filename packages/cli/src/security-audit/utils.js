'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.toReportTitle = exports.toFlaggedNode = void 0;
exports.getNodeTypes = getNodeTypes;
const toFlaggedNode = ({ node, workflow }) => ({
	kind: 'node',
	workflowId: workflow.id,
	workflowName: workflow.name,
	nodeId: node.id,
	nodeName: node.name,
	nodeType: node.type,
});
exports.toFlaggedNode = toFlaggedNode;
const toReportTitle = (riskCategory) =>
	riskCategory.charAt(0).toUpperCase() + riskCategory.slice(1) + ' Risk Report';
exports.toReportTitle = toReportTitle;
function getNodeTypes(workflows, test) {
	return workflows.reduce((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (test(node)) acc.push((0, exports.toFlaggedNode)({ node, workflow }));
		});
		return acc;
	}, []);
}
//# sourceMappingURL=utils.js.map
