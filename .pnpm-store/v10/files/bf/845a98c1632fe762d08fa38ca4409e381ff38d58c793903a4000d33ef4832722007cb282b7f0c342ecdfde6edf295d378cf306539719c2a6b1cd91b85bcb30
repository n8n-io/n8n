import { ICallNotification, TWorkerMessage } from 'worker-timers-worker';

export const isCallNotification = (message: TWorkerMessage): message is ICallNotification => {
    return (<ICallNotification>message).method !== undefined && (<ICallNotification>message).method === 'call';
};
