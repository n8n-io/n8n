import { t } from '../trpc';

export const helloTrpcRouter = t.router({
	hello: t.procedure.query(async () => ({ hello: 'world' })),
});

export type HelloTrpcRouter = typeof helloTrpcRouter;
