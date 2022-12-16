import EventEmitter from 'events';

interface EventTypes {
	nodeFetchedData: string;
	workflowExecutionCompleted: string;
}

class N8NEventEmitter extends EventEmitter {
	types: EventTypes = {
		nodeFetchedData: 'nodeFetchedData',
		workflowExecutionCompleted: 'workflowExecutionCompleted',
	};
}

export const eventEmitter = new N8NEventEmitter();
