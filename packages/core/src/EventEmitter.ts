import EventEmitter from 'events';

class N8NEventEmitter extends EventEmitter {}

export const eventEmitter = new N8NEventEmitter();
