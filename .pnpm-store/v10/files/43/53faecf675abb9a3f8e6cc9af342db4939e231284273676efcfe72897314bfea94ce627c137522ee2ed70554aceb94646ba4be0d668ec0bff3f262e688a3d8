import debug from 'debug';
const log = debug('eslint-plugin-import-x:utils:ModuleCache');
export class ModuleCache {
    constructor(map = new Map()) {
        this.map = map;
    }
    set(cacheKey, result) {
        this.map.set(cacheKey, {
            result,
            lastSeen: process.hrtime(),
        });
        log('setting entry for', cacheKey);
        return result;
    }
    get(cacheKey, settings) {
        const cache = this.map.get(cacheKey);
        if (cache) {
            if (process.hrtime(cache.lastSeen)[0] < settings.lifetime) {
                return cache.result;
            }
        }
        else {
            log('cache miss for', cacheKey);
        }
    }
    static getSettings(settings) {
        const cacheSettings = {
            lifetime: 30,
            ...settings['import-x/cache'],
        };
        if (typeof cacheSettings.lifetime === 'string' &&
            ['∞', 'Infinity'].includes(cacheSettings.lifetime)) {
            cacheSettings.lifetime = Number.POSITIVE_INFINITY;
        }
        return cacheSettings;
    }
}
//# sourceMappingURL=module-cache.js.map