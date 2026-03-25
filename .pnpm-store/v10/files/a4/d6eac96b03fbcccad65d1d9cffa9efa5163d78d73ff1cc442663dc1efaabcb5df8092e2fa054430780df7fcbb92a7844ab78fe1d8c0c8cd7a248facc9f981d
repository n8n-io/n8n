/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { diag } from '@opentelemetry/api';
import { isExportRetryable, parseRetryAfterToMills, } from '../is-export-retryable';
class FetchTransport {
    _parameters;
    constructor(_parameters) {
        this._parameters = _parameters;
    }
    async send(data, timeoutMillis) {
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), timeoutMillis);
        try {
            const isBrowserEnvironment = !!globalThis.location;
            const url = new URL(this._parameters.url);
            const response = await fetch(url.href, {
                method: 'POST',
                headers: this._parameters.headers(),
                body: data,
                signal: abortController.signal,
                keepalive: isBrowserEnvironment,
                mode: isBrowserEnvironment
                    ? globalThis.location?.origin === url.origin
                        ? 'same-origin'
                        : 'cors'
                    : 'no-cors',
            });
            if (response.status >= 200 && response.status <= 299) {
                diag.debug('response success');
                return { status: 'success' };
            }
            else if (isExportRetryable(response.status)) {
                const retryAfter = response.headers.get('Retry-After');
                const retryInMillis = parseRetryAfterToMills(retryAfter);
                return { status: 'retryable', retryInMillis };
            }
            return {
                status: 'failure',
                error: new Error('Fetch request failed with non-retryable status'),
            };
        }
        catch (error) {
            if (error?.name === 'AbortError') {
                return {
                    status: 'failure',
                    error: new Error('Fetch request timed out', { cause: error }),
                };
            }
            return {
                status: 'failure',
                error: new Error('Fetch request errored', { cause: error }),
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    shutdown() {
        // Intentionally left empty, nothing to do.
    }
}
/**
 * Creates an exporter transport that uses `fetch` to send the data
 * @param parameters applied to each request made by transport
 */
export function createFetchTransport(parameters) {
    return new FetchTransport(parameters);
}
//# sourceMappingURL=fetch-transport.js.map