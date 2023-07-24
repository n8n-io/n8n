import { UserModel } from './user';
import { CredentialModel } from './credential';
import { CredentialTypeModel } from './credentialType';
import { VariableModel } from './variable';

export const models = {
	credential: CredentialModel,
	credentialType: CredentialTypeModel,
	user: UserModel,
	variable: VariableModel,
};
