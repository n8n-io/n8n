/* eslint-disable no-restricted-syntax */
/**
 * (C) Copyright IBM Corp. 2019, 2024.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import camelcase from 'camelcase';
import logger from '../../lib/logger';
import { isEmptyObject } from '../../lib/helper';
import { readCredentialsFile } from './file-reading-helpers';
/**
 * Read properties stored in external sources like Environment Variables,
 * the credentials file, VCAP services, etc. and return them as an
 * object. The keys of this object will have the service name prefix removed
 * and will be converted to lower camel case.
 *
 * Only one source will be used at a time.
 *
 * @param serviceName - the service name prefix
 */
export function readExternalSources(serviceName) {
    if (!serviceName) {
        throw new Error('Service name is required.');
    }
    return getProperties(serviceName);
}
function getProperties(serviceName) {
    // Try to get properties from external sources, with the following priority:
    // 1. Credentials file (ibm-credentials.env)
    // 2. Environment variables
    // 3. VCAP Services (Cloud Foundry)
    // only get properties from one source, return null if none found
    let properties = null;
    logger.debug(`Retrieving config properties for service '${serviceName}'`);
    properties = filterPropertiesByServiceName(readCredentialsFile(), serviceName);
    if (isEmptyObject(properties)) {
        properties = filterPropertiesByServiceName(process.env, serviceName);
    }
    if (isEmptyObject(properties)) {
        properties = getPropertiesFromVCAP(serviceName);
    }
    logger.debug(`Retrieved ${Object.keys(properties).length} properties`);
    return properties;
}
/**
 * Pulls credentials from env properties
 *
 * Property checked is uppercase service.name suffixed by _USERNAME and _PASSWORD
 *
 * For example, if service.name is speech_to_text,
 * env properties are SPEECH_TO_TEXT_USERNAME and SPEECH_TO_TEXT_PASSWORD
 *
 * @param envObj - the object containing the credentials keyed by environment variables
 * @returns the set of credentials
 */
function filterPropertiesByServiceName(envObj, serviceName) {
    const credentials = {};
    const name = `${serviceName.toUpperCase().replace(/-/g, '_')}_`; // append the underscore that must follow the service name
    // filter out properties that don't begin with the service name
    Object.keys(envObj).forEach((key) => {
        if (key.startsWith(name)) {
            const propName = camelcase(key.substring(name.length)); // remove the name from the front of the string and make camelcase
            credentials[propName] = envObj[key];
        }
    });
    // all env variables are parsed as strings, convert boolean vars as needed
    if (typeof credentials.disableSsl === 'string') {
        credentials.disableSsl = credentials.disableSsl === 'true';
    }
    if (typeof credentials.authDisableSsl === 'string') {
        credentials.authDisableSsl = credentials.authDisableSsl === 'true';
    }
    if (typeof credentials.enableGzip === 'string') {
        credentials.enableGzip = credentials.enableGzip === 'true';
    }
    if (typeof credentials.enableRetries === 'string') {
        credentials.enableRetries = credentials.enableRetries === 'true';
    }
    if (typeof credentials.maxRetries === 'string') {
        credentials.maxRetries = parseInt(credentials.maxRetries, 10);
    }
    if (typeof credentials.retryInterval === 'string') {
        credentials.retryInterval = parseInt(credentials.retryInterval, 10);
    }
    return credentials;
}
/**
 * Pulls credentials from VCAP_SERVICES env property that IBM Cloud sets
 *
 * The function will first look for a service entry whose "name" field matches
 * the serviceKey value. If found, return its credentials.
 *
 * If no match against the service entry's "name" field is found, then find the
 * service list with a key matching the serviceKey value. If found, return the
 * credentials of the first service in the service list.
 */
function getVCAPCredentialsForService(name) {
    if (process.env.VCAP_SERVICES) {
        const services = JSON.parse(process.env.VCAP_SERVICES);
        for (const serviceName of Object.keys(services)) {
            for (const instance of services[serviceName]) {
                if (instance.name === name) {
                    if (Object.prototype.hasOwnProperty.call(instance, 'credentials')) {
                        return instance.credentials;
                    }
                    logger.debug('no data read from VCAP_SERVICES');
                    return {};
                }
            }
        }
        for (const serviceName of Object.keys(services)) {
            if (serviceName === name) {
                if (services[serviceName].length > 0) {
                    if (Object.prototype.hasOwnProperty.call(services[serviceName][0], 'credentials')) {
                        return services[serviceName][0].credentials;
                    }
                    logger.debug('no data read from VCAP_SERVICES');
                    return {};
                }
                logger.debug('no data read from VCAP_SERVICES');
                return {};
            }
        }
    }
    logger.debug('no data read from VCAP_SERVICES');
    return {};
}
function getPropertiesFromVCAP(serviceName) {
    const credentials = getVCAPCredentialsForService(serviceName);
    // infer authentication type from credentials in a simple manner
    // iam is used as the default later
    if (credentials.username || credentials.password) {
        credentials.authType = 'basic';
    }
    return credentials;
}
