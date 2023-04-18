import { Server } from 'miragejs';
import { routesForUsers } from './user';
import { routesForCredentials } from './credential';
import { routesForCredentialTypes } from './credentialType';
import { routesForVariables } from './variable';
import { routesForSettings } from './settings';

const endpoints: Array<(server: Server) => void> = [
	routesForCredentials,
	routesForCredentialTypes,
	routesForUsers,
	routesForVariables,
	routesForSettings,
];

export { endpoints };
