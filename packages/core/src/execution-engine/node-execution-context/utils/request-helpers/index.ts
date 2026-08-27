import { configureGlobalAxiosDefaults } from '@n8n/backend-network';

// Applies n8n's global axios defaults and registers the request interceptor.
configureGlobalAxiosDefaults();

export { getRequestHelperFunctions } from './factory';
