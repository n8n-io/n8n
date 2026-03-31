import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { PinData, PinDataGenerationInstructions } from '../types';
export interface GeneratePinDataOptions {
	workflow: WorkflowJSON;
	nodeNames: string[];
	instructions?: PinDataGenerationInstructions;
}
export declare function generatePinData(options: GeneratePinDataOptions): Promise<PinData>;
