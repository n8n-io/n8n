export enum EventMessageTypeNames {
	eventMessage = '$$EventMessage',
	eventMessageAudit = '$$EventMessageAudit',
	eventMessageConfirm = '$$EventMessageConfirm',
	eventMessageWorkflow = '$$EventMessageWorkflow',
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
