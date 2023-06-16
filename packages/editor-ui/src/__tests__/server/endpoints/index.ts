import type { Server } from 'miragejs';
import { routesForUsers } from './user';
import { routesForCredentials } from './credential';
import { routesForCredentialTypes } from './credentialType';
import { routesForVariables } from './variable';
import { routesForSettings } from './settings';
import { routesForSSO } from './sso';
import { routesForVersionControl } from './versionControl';

const endpoints: Array<(server: Server) => void> = [
	routesForCredentials,
	routesForCredentialTypes,
	routesForUsers,
	routesForVariables,
	routesForSettings,
	routesForSSO,
	routesForVersionControl,
];

export { endpoints };
