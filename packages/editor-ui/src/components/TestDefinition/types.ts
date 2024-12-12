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
}

export interface EvaluationFormState extends EditableFormState {
	description: string;
	evaluationWorkflow: INodeParameterResourceLocator;
	metrics: TestMetricRecord[];
}

export interface TestExecution {
	lastRun: string | null;
	errorRate: number | null;
	metrics: Record<string, number>;
}

export interface TestListItem {
	id: string;
	name: string;
	tagName: string;
	testCases: number;
	execution: TestExecution;
}
