import { createRequire } from 'module';
import patch from './data-patch.js';

const require = createRequire(import.meta.url);
const mdnAtrules = require('mdn-data/css/at-rules.json');
const mdnProperties = require('mdn-data/css/properties.json');
const mdnSyntaxes = require('mdn-data/css/syntaxes.json');

const extendSyntax = /^\s*\|\s*/;

function preprocessAtrules(dict) {
    const result = Object.create(null);

    for (const atruleName in dict) {
        const atrule = dict[atruleName];
        let descriptors = null;

        if (atrule.descriptors) {
            descriptors = Object.create(null);

            for (const descriptor in atrule.descriptors) {
                descriptors[descriptor] = atrule.descriptors[descriptor].syntax;
            }
        }

        result[atruleName.substr(1)] = {
            prelude: atrule.syntax.trim().replace(/\{(.|\s)+\}/, '').match(/^@\S+\s+([^;\{]*)/)[1].trim() || null,
            descriptors
        };
    }

    return result;
}

function patchDictionary(dict, patchDict) {
    const result = {};

    // copy all syntaxes for an original dict
    for (const key in dict) {
        result[key] = dict[key].syntax || dict[key];
    }

    // apply a patch
    for (const key in patchDict) {
        if (key in dict) {
            if (patchDict[key].syntax) {
                result[key] = extendSyntax.test(patchDict[key].syntax)
                    ? result[key] + ' ' + patchDict[key].syntax.trim()
                    : patchDict[key].syntax;
            } else {
                delete result[key];
            }
        } else {
            if (patchDict[key].syntax) {
                result[key] = patchDict[key].syntax.replace(extendSyntax, '');
            }
        }
    }

    return result;
}

function patchAtrules(dict, patchDict) {
    const result = {};

    // copy all syntaxes for an original dict
    for (const key in dict) {
        const patchDescriptors = (patchDict[key] && patchDict[key].descriptors) || null;

        result[key] = {
            prelude: key in patchDict && 'prelude' in patchDict[key]
                ? patchDict[key].prelude
                : dict[key].prelude || null,
            descriptors: patchDictionary(dict[key].descriptors || {}, patchDescriptors || {})
        };
    }

    // apply a patch
    for (const key in patchDict) {
        if (!hasOwnProperty.call(dict, key)) {
            result[key] = {
                prelude: patchDict[key].prelude || null,
                descriptors: patchDict[key].descriptors && patchDictionary({}, patchDict[key].descriptors)
            };
        }
    }

    return result;
}

export default {
    types: patchDictionary(mdnSyntaxes, patch.types),
    atrules: patchAtrules(preprocessAtrules(mdnAtrules), patch.atrules),
    properties: patchDictionary(mdnProperties, patch.properties)
};
