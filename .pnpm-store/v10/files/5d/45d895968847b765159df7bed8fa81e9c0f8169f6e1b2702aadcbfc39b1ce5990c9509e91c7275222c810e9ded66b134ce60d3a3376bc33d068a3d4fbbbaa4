import { PassThrough } from 'stream';
declare class Message extends PassThrough {
    type: number;
    resetConnection: boolean;
    ignore: boolean;
    constructor({ type, resetConnection }: {
        type: number;
        resetConnection?: boolean | undefined;
    });
}
export default Message;
