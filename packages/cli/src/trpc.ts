import { initTRPC } from '@trpc/server';
import type { inferAsyncReturnType } from '@trpc/server';
import type * as trpcExpress from '@trpc/server/adapters/express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const createContext = (opts: trpcExpress.CreateExpressContextOptions) => ({});

type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create();
