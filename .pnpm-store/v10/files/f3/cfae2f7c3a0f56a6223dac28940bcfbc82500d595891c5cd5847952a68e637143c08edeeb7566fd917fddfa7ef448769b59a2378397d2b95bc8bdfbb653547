import { Agent } from 'undici';
declare global {
    interface RequestInit {
        dispatcher?: Agent | undefined;
    }
}
export declare const createDispatcher: (connections?: number) => Agent;
