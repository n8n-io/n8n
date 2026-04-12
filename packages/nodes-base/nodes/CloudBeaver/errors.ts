import { OperationalError } from 'n8n-workflow';

export class CloudBeaverError extends OperationalError {}
export class QueryError extends CloudBeaverError {}
export class ContextError extends CloudBeaverError {}
export class TimeoutError extends CloudBeaverError {}
