import type { TestMetricRecord, TestRunRecord } from '@/api/testDefinition.ee';
import type { INodeParameterResourceLocator } from 'n8n-workflow';

export interface EditableField<T = string> {
	value: T;
	tempValue: T;
	isEditing: boolean;
}

export interface TestItemAction {
	icon: string;
	id: string;
	event: (testId: string) => void | Promise<void>;
	tooltip: (testId: string) => string;
	disabled?: (testId: string) => boolean;
	show?: (testId: string) => boolean;
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

export interface TestExecution {
	lastRun: string | null;
	errorRate: number | null;
	metrics: Record<string, number>;
	status: TestRunRecord['status'];
	id: string | null;
}

export interface TestListItem {
	id: string;
	name: string;
	tagName: string;
	testCases: number;
	execution: TestExecution;
	fieldsIssues?: Array<{ field: string; message: string }>;
}
