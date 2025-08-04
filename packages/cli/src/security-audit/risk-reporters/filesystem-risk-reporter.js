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
exports.FilesystemRiskReporter = void 0;
const di_1 = require('@n8n/di');
const constants_1 = require('@/security-audit/constants');
const utils_1 = require('@/security-audit/utils');
let FilesystemRiskReporter = class FilesystemRiskReporter {
	async report(workflows) {
		const fsInteractionNodeTypes = (0, utils_1.getNodeTypes)(workflows, (node) =>
			constants_1.FILESYSTEM_INTERACTION_NODE_TYPES.has(node.type),
		);
		if (fsInteractionNodeTypes.length === 0) return null;
		const report = {
			risk: constants_1.FILESYSTEM_REPORT.RISK,
			sections: [],
		};
		const sentenceStart = ({ length }) =>
			length > 1 ? 'These nodes read from and write to' : 'This node reads from and writes to';
		if (fsInteractionNodeTypes.length > 0) {
			report.sections.push({
				title: constants_1.FILESYSTEM_REPORT.SECTIONS.FILESYSTEM_INTERACTION_NODES,
				description: [
					sentenceStart(fsInteractionNodeTypes),
					'any accessible file in the host filesystem. Sensitive file content may be manipulated through a node operation.',
				].join(' '),
				recommendation:
					'Consider protecting any sensitive files in the host filesystem, or refactoring the workflow so that it does not require host filesystem interaction.',
				location: fsInteractionNodeTypes,
			});
		}
		return report;
	}
};
exports.FilesystemRiskReporter = FilesystemRiskReporter;
exports.FilesystemRiskReporter = FilesystemRiskReporter = __decorate(
	[(0, di_1.Service)()],
	FilesystemRiskReporter,
);
//# sourceMappingURL=filesystem-risk-reporter.js.map
