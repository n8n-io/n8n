export enum EventMessageTypeNames {
	generic = '$$EventMessage',
	audit = '$$EventMessageAudit',
	confirm = '$$EventMessageConfirm',
	workflow = '$$EventMessageWorkflow',
}

// Uses same logging levels as LoggerProxy
export enum EventMessageLevel {
	debug = 'debug',
	verbose = 'verbose',
	log = 'log',
	info = 'info',
	warn = 'warn',
	error = 'error',
}
