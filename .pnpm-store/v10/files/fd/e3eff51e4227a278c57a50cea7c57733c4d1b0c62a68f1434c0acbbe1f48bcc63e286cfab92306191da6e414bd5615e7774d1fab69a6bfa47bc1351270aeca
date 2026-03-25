import * as http from 'http';
import * as https from 'https';
import { once } from 'events';
import { JOSEError, JWKSTimeout } from '../util/errors.js';
import { concat, decoder } from '../lib/buffer_utils.js';
const fetchJwks = async (url, timeout, options) => {
    let get;
    switch (url.protocol) {
        case 'https:':
            get = https.get;
            break;
        case 'http:':
            get = http.get;
            break;
        default:
            throw new TypeError('Unsupported URL protocol.');
    }
    const { agent, headers } = options;
    const req = get(url.href, {
        agent,
        timeout,
        headers,
    });
    const [response] = (await Promise.race([once(req, 'response'), once(req, 'timeout')]));
    if (!response) {
        req.destroy();
        throw new JWKSTimeout();
    }
    if (response.statusCode !== 200) {
        throw new JOSEError('Expected 200 OK from the JSON Web Key Set HTTP response');
    }
    const parts = [];
    for await (const part of response) {
        parts.push(part);
    }
    try {
        return JSON.parse(decoder.decode(concat(...parts)));
    }
    catch {
        throw new JOSEError('Failed to parse the JSON Web Key Set HTTP response as JSON');
    }
};
export default fetchJwks;
