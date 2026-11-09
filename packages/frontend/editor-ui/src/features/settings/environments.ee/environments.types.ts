import type {
	CreateEnvironmentVariable,
	EnvironmentVariable,
	ResourceEditorDestination,
} from '@n8n/frontend-module-sdk';

export type { CreateEnvironmentVariable, EnvironmentVariable };

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
	allowOnProtectedInstance?: boolean;
	appendToBody?: boolean;
};
