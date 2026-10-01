import { UnexpectedError } from 'n8n-workflow';

/**
 * Error thrown during instance bootstrapping when environment variable
 * configuration is invalid. These errors indicate a misconfiguration
 * that must be fixed before the instance can start.
 */
export class InstanceBootstrappingError extends UnexpectedError {}
