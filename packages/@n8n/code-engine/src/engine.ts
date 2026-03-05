import { getClassMetadata } from './metadata';
import { createTracedInstance } from './tracer';
import type { Constructor, ClassMetadata, ExecutionTrace, StaticGraph } from './types';

interface RouteEntry {
	method: string;
	path: string;
	handler: (body: unknown) => Promise<unknown>;
}

interface Registration {
	cls: Constructor;
	metadata: ClassMetadata;
}

export class CodeEngine {
	private registrations: Registration[] = [];

	private lastTrace: ExecutionTrace | undefined;

	register(cls: Constructor): void {
		const metadata = getClassMetadata(cls);
		this.registrations.push({ cls, metadata });
	}

	getRoutes(): RouteEntry[] {
		const routes: RouteEntry[] = [];

		for (const { cls, metadata } of this.registrations) {
			for (const httpMethod of metadata.httpMethods) {
				const fullPath = metadata.controller.basePath + httpMethod.path;

				routes.push({
					method: httpMethod.method,
					path: fullPath,
					handler: async (body: unknown) => {
						const instance = new cls();
						const { proxy, getTrace } = createTracedInstance(instance, metadata);

						try {
							const method = proxy[httpMethod.propertyKey as keyof typeof proxy];
							if (typeof method !== 'function') {
								throw new Error(`Method ${httpMethod.propertyKey} is not a function`);
							}
							const result = await (method as (body: unknown) => unknown)(body);
							this.lastTrace = getTrace();
							return result;
						} catch (err) {
							this.lastTrace = getTrace();
							throw err;
						}
					},
				});
			}
		}

		return routes;
	}

	getStaticGraph(): StaticGraph {
		const allNodes: StaticGraph['nodes'] = [];
		const allEdges: StaticGraph['edges'] = [];

		for (const { metadata } of this.registrations) {
			for (const httpMethod of metadata.httpMethods) {
				allNodes.push({
					id: httpMethod.propertyKey,
					label: httpMethod.path,
					type: 'trigger',
					method: httpMethod.method,
					path: httpMethod.path,
				});
			}

			for (const callable of metadata.callables) {
				allNodes.push({
					id: callable.propertyKey,
					label: callable.description,
					type: 'callable',
				});
			}
		}

		// For edges, we'd need source code. For now return metadata-based graph.
		// The full static analysis happens via analyzeCodeString() with raw code.
		return { nodes: allNodes, edges: allEdges };
	}

	getLastTrace(): ExecutionTrace | undefined {
		return this.lastTrace;
	}
}
