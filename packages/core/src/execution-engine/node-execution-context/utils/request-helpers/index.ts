import { configureAxiosDefaults } from '@n8n/backend-network';

// Applies n8n's global axios defaults and registers the request interceptor.
configureAxiosDefaults();

export { getRequestHelperFunctions } from './factory';
