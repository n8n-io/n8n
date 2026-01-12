import type { IDescriptor } from 'intento-core';

/**
 * Metadata descriptor for EchoGarden segmentation supplier.
 * Provides identification and display information for ICU-based text segmentation in n8n workflows.
 */
export const EchoGardenDescriptor: IDescriptor = {
	name: 'ai.text.segmentation.echogarden',
	symbol: '🚚 [EchoGarden]',
	tool: 'intentoEchoGardenSegmentationTool',
	node: 'intentoEchoGardenSegmentationNode',
	displayName: 'EchoGarden Segmentation Supplier',
	description:
		'ICU-based text segmentation with custom suppression support for accurate sentence boundary detection across multiple languages',
};
