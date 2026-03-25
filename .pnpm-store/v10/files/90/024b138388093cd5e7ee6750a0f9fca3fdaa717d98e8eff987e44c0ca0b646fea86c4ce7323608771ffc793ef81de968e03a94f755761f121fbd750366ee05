import {CallContext} from './CallContext';
import {ServerMiddleware, ServerMiddlewareCall} from './ServerMiddleware';

export function composeServerMiddleware<Ext1, Ext2, RequiredCallContextExt>(
  middleware1: ServerMiddleware<Ext1, RequiredCallContextExt>,
  middleware2: ServerMiddleware<Ext2, RequiredCallContextExt & Ext1>,
): ServerMiddleware<Ext1 & Ext2, RequiredCallContextExt> {
  return <Request, Response>(
    call: ServerMiddlewareCall<
      Request,
      Response,
      Ext1 & Ext2 & RequiredCallContextExt
    >,
    context: CallContext & RequiredCallContextExt,
  ) => {
    return middleware1<Request, Response>(
      {
        ...call,
        next: (request, context1) => {
          return middleware2<Request, Response>(
            {...call, request} as any,
            context1,
          ) as any;
        },
      },
      context,
    );
  };
}
