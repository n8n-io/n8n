export enum EventMessageTypeNames {
	eventMessage = '$$EventMessage',
	eventMessageAudit = '$$EventMessageAudit',
	eventMessageConfirm = '$$EventMessageConfirm',
	eventMessageWorkflow = '$$EventMessageWorkflow',
}

// Uses same logging levels as LoggerProxy
export enum EventMessageLevel {
	log = 'log',
	debug = 'debug',
	info = 'info',
	error = 'error',
	verbose = 'verbose',
	warn = 'warn',
	allLevels = '*',
}
