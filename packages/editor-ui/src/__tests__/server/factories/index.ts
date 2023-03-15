import { userFactory } from './user';
import { credentialFactory } from './credential';
import { credentialTypeFactory } from './credentialType';

export * from './user';
export * from './credential';
export * from './credentialType';

export const factories = {
	credential: credentialFactory,
	credentialType: credentialTypeFactory,
	user: userFactory,
};
