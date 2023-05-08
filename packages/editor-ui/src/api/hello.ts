import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { HelloTrpcRouter } from '../../../cli/src/controllers/hello.controller.trpc';

const trpcProxyClient = createTRPCProxyClient<HelloTrpcRouter>({
	links: [httpBatchLink({ url: 'http://localhost:5678/trpc' })],
});

export function getHelloWorld() {
	return trpcProxyClient.hello.query(); // type safe!
}
