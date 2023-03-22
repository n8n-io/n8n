import { routesForUsers } from './user';
import { routesForCredentials } from './credential';
import { Server } from 'miragejs';
import { routesForCredentialTypes } from '@/__tests__/server/endpoints/credentialType';

const endpoints: Array<(server: Server) => void> = [
	routesForCredentials,
	routesForCredentialTypes,
	routesForUsers,
];

export { endpoints };
