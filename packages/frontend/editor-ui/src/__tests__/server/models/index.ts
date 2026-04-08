import { UserModel } from './user';
import { CredentialModel } from './credential';
import { CredentialTypeModel } from './credentialType';
import { VariableModel } from './variable';
import { WorkflowModel } from './workflow';
import { TagModel } from './tag';

export const models = {
	credential: CredentialModel,
	credentialType: CredentialTypeModel,
	user: UserModel,
	variable: VariableModel,
	workflow: WorkflowModel,
	tag: TagModel,
};
