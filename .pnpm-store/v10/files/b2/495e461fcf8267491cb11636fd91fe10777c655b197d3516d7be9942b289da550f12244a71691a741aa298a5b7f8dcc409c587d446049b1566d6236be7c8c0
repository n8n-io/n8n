import { Dispatcher } from "undici";
/**
 * Converts an undici response to a fetch response.
 * This is necessary because node's fetch does not support disabling SSL validation (https://github.com/orgs/nodejs/discussions/44038).
 *
 * @param undiciResponse The undici response to convert.
 * @returns The fetch response.
 */
export declare function undiciResponseToFetchResponse(undiciResponse: Dispatcher.ResponseData): Response;
