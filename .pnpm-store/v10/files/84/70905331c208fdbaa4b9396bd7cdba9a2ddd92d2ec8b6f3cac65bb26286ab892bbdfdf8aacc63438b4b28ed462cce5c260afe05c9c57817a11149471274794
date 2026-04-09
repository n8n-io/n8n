import { traverse, clearCache } from './traverse';
import { sampleArray, sampleBoolean, sampleNumber, sampleObject, sampleString } from './samplers/index';
import { XMLBuilder } from 'fast-xml-parser';

export var _samplers = {};

const defaults = {
  skipReadOnly: false,
  maxSampleDepth: 15,
};

function convertJsonToXml(obj, schema) {
  if (!obj) {
    throw new Error('Unknown format output for building XML.');
  }
  if (Array.isArray(obj) || Object.keys(obj).length > 1) {
    obj = { [schema?.xml?.name || 'root']: obj }; // XML document must contain one root element
  }
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    attributeNamePrefix: '$',
    textNodeName: '#text',
    cdataPropName: '#cdata',
  });
  return builder.build(obj);
}

export function sample(schema, options, spec) {
  let opts = Object.assign({}, defaults, options);
  clearCache();
  let result = traverse(schema, opts, spec).value;
  if (opts?.format === 'xml') {
    return convertJsonToXml(result, schema);
  }
  return result;
};

export function _registerSampler(type, sampler) {
  _samplers[type] = sampler;
};

export { inferType } from './infer';

_registerSampler('array', sampleArray);
_registerSampler('boolean', sampleBoolean);
_registerSampler('integer', sampleNumber);
_registerSampler('number', sampleNumber);
_registerSampler('object', sampleObject);
_registerSampler('string', sampleString);
