import { isBuiltin } from 'node:module';
import path from 'node:path';
import { ResolverFactory } from 'unrs-resolver';
export function createNodeResolver({ extensions = ['.mjs', '.cjs', '.js', '.json', '.node'], conditionNames = ['import', 'require', 'default'], mainFields = ['module', 'main'], ...restOptions } = {}) {
    const resolver = new ResolverFactory({
        extensions,
        conditionNames,
        mainFields,
        ...restOptions,
    });
    return {
        interfaceVersion: 3,
        name: 'eslint-plugin-import-x:node',
        resolve(modulePath, sourceFile) {
            if (isBuiltin(modulePath) || modulePath.startsWith('data:')) {
                return { found: true, path: null };
            }
            try {
                const resolved = resolver.sync(path.dirname(sourceFile), modulePath);
                if (resolved.path) {
                    return { found: true, path: resolved.path };
                }
            }
            catch {
            }
            return { found: false };
        },
    };
}
//# sourceMappingURL=node-resolver.js.map