'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.mockNodeTypesData = mockNodeTypesData;
function mockNodeTypesData(nodeNames, options) {
	return nodeNames.reduce((acc, nodeName) => {
		const fullName = nodeName.indexOf('.') === -1 ? `n8n-nodes-base.${nodeName}` : nodeName;
		return (
			(acc[fullName] = {
				sourcePath: '',
				type: {
					description: {
						displayName: nodeName,
						name: nodeName,
						group: [],
						description: '',
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
					},
					trigger: options?.addTrigger ? async () => undefined : undefined,
				},
			}),
			acc
		);
	}, {});
}
//# sourceMappingURL=node-types-data.js.map
