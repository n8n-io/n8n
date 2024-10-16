import { userFactory } from './user';
import { credentialFactory } from './credential';
import { credentialTypeFactory } from './credentialType';
import { variableFactory } from './variable';
import { workflowFactory } from './workflow';
import { tagFactory } from './tag';

export * from './user';
export * from './credential';
export * from './credentialType';
export * from './variable';

export const factories = {
	credential: credentialFactory,
	credentialType: credentialTypeFactory,
	user: userFactory,
	variable: variableFactory,
	workflow: workflowFactory,
	tag: tagFactory,
};
