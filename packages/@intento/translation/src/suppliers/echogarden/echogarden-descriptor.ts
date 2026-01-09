import type { IDescriptor } from 'intento-core';

export const EchoGardenDescriptor: IDescriptor = {
	name: 'ai.text.segmentation.echogarden',
	tool: 'intentoEchoGardenSegmentationTool',
	node: 'intentoEchoGardenSegmentationNode',
	displayName: 'EchoGarden Segmentation Supplier',
	description: 'Supplier for Echo Garden segmentation services',
};
