import { IClearResponse, TWorkerMessage } from 'worker-timers-worker';

export const isClearResponse = (message: TWorkerMessage): message is IClearResponse => {
    return (<IClearResponse>message).error === null && typeof message.id === 'number';
};
