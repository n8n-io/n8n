import type { TestMetricRecord } from '@/api/testDefinition.ee';
import type { INodeParameterResourceLocator } from 'n8n-workflow';

export interface EditableField<T = string> {
	value: T;
	tempValue: T;
	isEditing: boolean;
}
export interface EditableFormState {
	name: EditableField<string>;
	tags: EditableField<string[]>;
	description: EditableField<string>;
}

export interface EvaluationFormState extends EditableFormState {
	evaluationWorkflow: INodeParameterResourceLocator;
	metrics: TestMetricRecord[];
	mockedNodes: Array<{ name: string; id: string }>;
}
