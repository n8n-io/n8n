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
	mockedNodes: Array<{ name: string; id: string }>;
}
