import type { ComponentInternalInstance, VNode } from 'vue';
import type { Mutable } from 'element-plus/es/utils';
import type { MessageHandler, MessageProps } from './message';
export declare type MessageContext = {
    id: string;
    vnode: VNode;
    handler: MessageHandler;
    vm: ComponentInternalInstance;
    props: Mutable<MessageProps>;
};
export declare const instances: MessageContext[];
export declare const getInstance: (id: string) => {
    current: MessageContext;
    prev: MessageContext | undefined;
};
export declare const getLastOffset: (id: string) => number;
export declare const getOffsetOrSpace: (id: string, offset: number) => number;
