import { traverse } from './traverse';
import { mergeDeep, SKIP_SYMBOL } from './utils';


export function allOfSample(into, children, options, spec, context) {
  let res = traverse(into, options, spec);
  const subSamples = [];

  for (let subSchema of children) {
    const { type, readOnly, writeOnly, value } = traverse({ type: res.type, ...subSchema }, options, spec, {
      ...context,
      isAllOfChild: true,
    });
    if (res.type && type && type !== res.type) {
      console.warn('allOf: schemas with different types can\'t be merged');
      res.type = type;
    }
    res.type = res.type || type;
    res.readOnly = res.readOnly || readOnly;
    res.writeOnly = res.writeOnly || writeOnly;
    if (value != null) subSamples.push(value);
  }

  if (res.type === 'object') {
    res.value = mergeDeep(res.value || {}, ...subSamples.filter(sample => typeof sample === 'object'));
    for (const key in res.value) {
      if (res.value[key] === SKIP_SYMBOL) {
        delete res.value[key];
      }
    }
    return res;
  } else {
    if (res.type === 'array') {
      // TODO: implement arrays
      if (!options.quiet) console.warn('OpenAPI Sampler: found allOf with "array" type. Result may be incorrect');
    }
    const lastSample = subSamples[subSamples.length - 1];
    res.value = lastSample != null ? lastSample : res.value;
    return res;
  }
}
