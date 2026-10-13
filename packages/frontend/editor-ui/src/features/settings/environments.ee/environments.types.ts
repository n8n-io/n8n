import type { ResourceEditorDestination } from '@/features/collaboration/projects/projects.types';
export interface EnvironmentVariable {
	id: string;
	key: string;
	value: string;
	project?: { id: string; name: string } | null;
}

export interface CreateEnvironmentVariable {
	key: string;
	value: string;
	projectId?: string | null;
}

export interface UpdateEnvironmentVariable extends CreateEnvironmentVariable {
	id: string;
}

export type VariableModalOptions = {
	notice?: () => string;
	mode?: 'new' | 'edit';
	variable?: EnvironmentVariable;
	projectId?: string | null;
	initialValues?: Pick<EnvironmentVariable, 'key' | 'value'>;
	fixedKey?: boolean;
	destination?: ResourceEditorDestination;
	onCreate?: (variable: CreateEnvironmentVariable) => Promise<EnvironmentVariable>;
	appendToBody?: boolean;
};
