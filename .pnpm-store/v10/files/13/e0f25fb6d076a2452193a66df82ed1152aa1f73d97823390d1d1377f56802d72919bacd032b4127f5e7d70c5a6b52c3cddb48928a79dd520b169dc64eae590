import { BeforeRequestContext, BeforeRequestHook, Awaitable } from './types';


export class CustomUserAgentHook implements BeforeRequestHook {
    beforeRequest(_: BeforeRequestContext, request: Request): Awaitable<Request> {
        const userAgent = request.headers.get('user-agent') as string;
        const version = userAgent.split(' ')[1];
        request.headers.set('user-agent', `mistral-azure-client-typescript/${version}`);
        return request;
    }
}