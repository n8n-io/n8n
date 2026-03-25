export function betaMemoryTool(handlers) {
    return {
        type: 'memory_20250818',
        name: 'memory',
        parse: (content) => content,
        run: (args) => {
            const handler = handlers[args.command];
            if (!handler) {
                throw new Error(`${args.command} not implemented`);
            }
            return handler.bind(handlers)(args);
        },
    };
}
//# sourceMappingURL=memory.mjs.map