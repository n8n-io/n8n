import { Attributes } from '@opentelemetry/api';
import { ExpressInstrumentationConfig, LayerPathSegment } from './types';
import { ExpressLayerType } from './enums/ExpressLayerType';
import { ExpressLayer, PatchedRequest, _LAYERS_STORE_PROPERTY } from './internal-types';
/**
 * Store layers path in the request to be able to construct route later
 * @param request The request where
 * @param [value] the value to push into the array
 */
export declare const storeLayerPath: (request: PatchedRequest, value?: string) => {
    isLayerPathStored: boolean;
};
/**
 * Recursively search the router path from layer stack
 * @param path The path to reconstruct
 * @param layer The layer to reconstruct from
 * @returns The reconstructed path
 */
export declare const getRouterPath: (path: string, layer: ExpressLayer) => string;
/**
 * Parse express layer context to retrieve a name and attributes.
 * @param route The route of the layer
 * @param layer Express layer
 * @param [layerPath] if present, the path on which the layer has been mounted
 */
export declare const getLayerMetadata: (route: string, layer: ExpressLayer, layerPath?: string) => {
    attributes: Attributes;
    name: string;
};
/**
 * Check whether the given request is ignored by configuration
 * It will not re-throw exceptions from `list` provided by the client
 * @param constant e.g URL of request
 * @param [list] List of ignore patterns
 * @param [onException] callback for doing something when an exception has
 *     occurred
 */
export declare const isLayerIgnored: (name: string, type: ExpressLayerType, config?: ExpressInstrumentationConfig) => boolean;
/**
 * Converts a user-provided error value into an error and error message pair
 *
 * @param error - User-provided error value
 * @returns Both an Error or string representation of the value and an error message
 */
export declare const asErrorAndMessage: (error: unknown) => [error: string | Error, message: string];
/**
 * Extracts the layer path from the route arguments
 *
 * @param args - Arguments of the route
 * @returns The layer path
 */
export declare const getLayerPath: (args: [LayerPathSegment | LayerPathSegment[], ...unknown[]]) => string | undefined;
export declare function getConstructedRoute(req: {
    originalUrl: PatchedRequest['originalUrl'];
    [_LAYERS_STORE_PROPERTY]?: string[];
}): string;
/**
 * Extracts the actual matched route from Express request for OpenTelemetry instrumentation.
 * Returns the route that should be used as the http.route attribute.
 *
 * @param req - The Express request object with layers store
 * @param layersStoreProperty - The property name where layer paths are stored
 * @returns The matched route string or undefined if no valid route is found
 */
export declare function getActualMatchedRoute(req: {
    originalUrl: PatchedRequest['originalUrl'];
    [_LAYERS_STORE_PROPERTY]?: string[];
}): string | undefined;
//# sourceMappingURL=utils.d.ts.map