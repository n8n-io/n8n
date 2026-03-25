import { _samplers } from './openapi-sampler';
import { allOfSample } from './allOf';
import { inferType } from './infer';
import { getResultForCircular, mergeDeep, popSchemaStack } from './utils';
import JsonPointer from 'json-pointer';

let $refCache = {};
// for circular JS references we use additional array and not object as we need to compare entire schemas and not strings
let seenSchemasStack = [];

export function clearCache() {
  $refCache = {};
  seenSchemasStack = [];
}

function inferExample(schema) {
  let example;
  if (schema.const !== undefined) {
    example = schema.const;
  } else if (schema.examples !== undefined && schema.examples.length) {
    example = schema.examples[0];
  } else if (schema.enum !== undefined && schema.enum.length) {
    example = schema.enum[0];
  } else if (schema.default !== undefined) {
    example = schema.default;
  }
  return example;
}

function tryInferExample(schema) {
  const example = inferExample(schema);
  // case when we don't infer example from schema but take from `const`, `examples`, `default` or `enum` keywords
  if (example !== undefined) {
    return {
      value: example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      type: null,
    };
  }
  return;
}

export function traverse(schema, options, spec, context) {
  // checking circular JS references by checking context
  // because context is passed only when traversing through nested objects happens
  if (context) {
    if (seenSchemasStack.includes(schema)) return getResultForCircular(inferType(schema));
    seenSchemasStack.push(schema);
  }


  if (context && context.depth > options.maxSampleDepth) {
    popSchemaStack(seenSchemasStack, context);
    return getResultForCircular(inferType(schema));
  }

  if (schema.$ref) {
    if (!spec) {
      throw new Error('Your schema contains $ref. You must provide full specification in the third parameter.');
    }
    let ref = decodeURIComponent(schema.$ref);
    if (ref.startsWith('#')) {
      ref = ref.substring(1);
    }

    const referenced = JsonPointer.get(spec, ref);
    let result;

    if ($refCache[ref] !== true) {
      $refCache[ref] = true;
      result = traverse(referenced, options, spec, context);
      $refCache[ref] = false;
    } else {
      const referencedType = inferType(referenced);
      result = getResultForCircular(referencedType);
    }
    popSchemaStack(seenSchemasStack, context);
    return result;
  }

  if (schema.example !== undefined) {
    popSchemaStack(seenSchemasStack, context);
    return {
      value: schema.example,
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly,
      type: schema.type,
    };
  }

  if (schema.allOf !== undefined) {
    popSchemaStack(seenSchemasStack, context);
    return tryInferExample(schema) || allOfSample(
      { ...schema, allOf: undefined },
      schema.allOf,
      options,
      spec,
      context,
    );
  }

  if (schema.oneOf && schema.oneOf.length) {
    if (schema.anyOf) {
      if (!options.quiet) console.warn('oneOf and anyOf are not supported on the same level. Skipping anyOf');
    }
    popSchemaStack(seenSchemasStack, context);

    // Make sure to pass down readOnly and writeOnly annotations from the parent
    const firstOneOf = Object.assign({
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly
    }, schema.oneOf[0]);

    return traverseOneOrAnyOf(schema, firstOneOf)
  }

  if (schema.anyOf && schema.anyOf.length) {
    popSchemaStack(seenSchemasStack, context);

    // Make sure to pass down readOnly and writeOnly annotations from the parent
    const firstAnyOf = Object.assign({
      readOnly: schema.readOnly,
      writeOnly: schema.writeOnly
    }, schema.anyOf[0]);

    return traverseOneOrAnyOf(schema, firstAnyOf)
  }

  if (schema.if && schema.then) {
    popSchemaStack(seenSchemasStack, context);
    const { if: ifSchema, then, ...rest } = schema;
    return traverse(mergeDeep(rest, ifSchema, then), options, spec, context);
  }

  let example = inferExample(schema);
  let type = null;
  if (example === undefined) {
    example = null;
    type = schema.type;
    if (Array.isArray(type) && schema.type.length > 0) {
      type = schema.type[0];
    }
    if (!type) {
      type = inferType(schema);
    }
    let sampler = _samplers[type];
    if (sampler) {
      example = sampler(schema, options, spec, context);
    }
  }

  popSchemaStack(seenSchemasStack, context);
  return {
    value: example,
    readOnly: schema.readOnly,
    writeOnly: schema.writeOnly,
    type: type
  };

  function traverseOneOrAnyOf(schema, selectedSubSchema) {
    const inferred = tryInferExample(schema);
    if (inferred !== undefined) {
      return inferred;
    }

    const localExample = traverse({...schema, oneOf: undefined, anyOf: undefined }, options, spec, context);
    const subSchemaExample = traverse(selectedSubSchema, options, spec, context);

    if (typeof localExample.value === 'object' && typeof subSchemaExample.value === 'object') {
      const mergedExample = mergeDeep(localExample.value, subSchemaExample.value);
      return {...subSchemaExample, value: mergedExample };
    }

    return subSchemaExample;
  }
}
