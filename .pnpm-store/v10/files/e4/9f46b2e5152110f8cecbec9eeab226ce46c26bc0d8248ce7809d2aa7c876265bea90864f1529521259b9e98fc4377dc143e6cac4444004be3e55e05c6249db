import {CallOptions} from './CallOptions';
import {ClientMiddleware, ClientMiddlewareCall} from './ClientMiddleware';

export function composeClientMiddleware<Ext1, Ext2, RequiredCallOptionsExt>(
  middleware1: ClientMiddleware<Ext1, RequiredCallOptionsExt>,
  middleware2: ClientMiddleware<Ext2, RequiredCallOptionsExt & Ext1>,
): ClientMiddleware<Ext1 & Ext2, RequiredCallOptionsExt> {
  return <Request, Response>(
    call: ClientMiddlewareCall<
      Request,
      Response,
      Ext1 & Ext2 & RequiredCallOptionsExt
    >,
    options: CallOptions & Partial<Ext1 & Ext2 & RequiredCallOptionsExt>,
  ) => {
    return middleware2<Request, Response>(
      {
        ...call,
        next: (request, options2) => {
          return middleware1<Request, Response>(
            {...call, request} as any,
            options2,
          ) as any;
        },
      },
      options,
    );
  };
}
