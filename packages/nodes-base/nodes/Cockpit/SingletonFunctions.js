import { cockpitApiRequest } from './GenericFunctions';
export async function getSingleton(resourceName) {
    return await cockpitApiRequest.call(this, 'GET', `/singletons/get/${resourceName}`);
}
export async function getAllSingletonNames() {
    return await cockpitApiRequest.call(this, 'GET', '/singletons/listSingletons', {});
}
//# sourceMappingURL=SingletonFunctions.js.map