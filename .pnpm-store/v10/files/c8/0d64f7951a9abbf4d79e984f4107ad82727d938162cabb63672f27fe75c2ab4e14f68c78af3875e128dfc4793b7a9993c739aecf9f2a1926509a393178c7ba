Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

/**
 * Type-guard: The attribute object has the shape the official attribute object (value, type, unit).
 * https://develop.sentry.dev/sdk/telemetry/scopes/#setting-attributes
 */
function isAttributeObject(maybeObj) {
  return (
    typeof maybeObj === 'object' &&
    maybeObj != null &&
    !Array.isArray(maybeObj) &&
    Object.keys(maybeObj).includes('value')
  );
}

/**
 * Converts an attribute value to a typed attribute value.
 *
 * For now, we intentionally only support primitive values and attribute objects with primitive values.
 * If @param useFallback is true, we stringify non-primitive values to a string attribute value. Otherwise
 * we return `undefined` for unsupported values.
 *
 * @param value - The value of the passed attribute.
 * @param useFallback - If true, unsupported values will be stringified to a string attribute value.
 *                      Defaults to false. In this case, `undefined` is returned for unsupported values.
 * @returns The typed attribute.
 */
function attributeValueToTypedAttributeValue(
  rawValue,
  useFallback,
) {
  const { value, unit } = isAttributeObject(rawValue) ? rawValue : { value: rawValue, unit: undefined };
  const attributeValue = getTypedAttributeValue(value);
  const checkedUnit = unit && typeof unit === 'string' ? { unit } : {};
  if (attributeValue) {
    return { ...attributeValue, ...checkedUnit };
  }

  if (!useFallback || (useFallback === 'skip-undefined' && value === undefined)) {
    return;
  }

  // Fallback: stringify the value
  // TODO(v11): be smarter here and use String constructor if stringify fails
  // (this is a breaking change for already existing attribute values)
  let stringValue = '';
  try {
    stringValue = JSON.stringify(value) ?? '';
  } catch {
    // Do nothing
  }
  return {
    value: stringValue,
    type: 'string',
    ...checkedUnit,
  };
}

/**
 * Serializes raw attributes to typed attributes as expected in our envelopes.
 *
 * @param attributes The raw attributes to serialize.
 * @param fallback   If true, unsupported values will be stringified to a string attribute value.
 *                   Defaults to false. In this case, `undefined` is returned for unsupported values.
 *
 * @returns The serialized attributes.
 */
function serializeAttributes(
  attributes,
  fallback = false,
) {
  const serializedAttributes = {};
  for (const [key, value] of Object.entries(attributes ?? {})) {
    const typedValue = attributeValueToTypedAttributeValue(value, fallback);
    if (typedValue) {
      serializedAttributes[key] = typedValue;
    }
  }
  return serializedAttributes;
}

/**
 * NOTE: We intentionally do not return anything for non-primitive values:
 *  - array support will come in the future but if we stringify arrays now,
 *    sending arrays (unstringified) later will be a subtle breaking change.
 *  - Objects are not supported yet and product support is still TBD.
 *  - We still keep the type signature for TypedAttributeValue wider to avoid a
 *    breaking change once we add support for non-primitive values.
 *  - Once we go back to supporting arrays and stringifying all other values,
 *    we already implemented the serialization logic here:
 *    https://github.com/getsentry/sentry-javascript/pull/18165
 */
function getTypedAttributeValue(value) {
  const primitiveType =
    typeof value === 'string'
      ? 'string'
      : typeof value === 'boolean'
        ? 'boolean'
        : typeof value === 'number' && !Number.isNaN(value)
          ? Number.isInteger(value)
            ? 'integer'
            : 'double'
          : null;
  if (primitiveType) {
    // @ts-expect-error - TS complains because {@link TypedAttributeValue} is strictly typed to
    // avoid setting the wrong `type` on the attribute value.
    // In this case, getPrimitiveType already does the check but TS doesn't know that.
    // The "clean" alternative is to return an object per `typeof value` case
    // but that would require more bundle size
    // Therefore, we ignore it.
    return { value, type: primitiveType };
  }
}

exports.attributeValueToTypedAttributeValue = attributeValueToTypedAttributeValue;
exports.isAttributeObject = isAttributeObject;
exports.serializeAttributes = serializeAttributes;
//# sourceMappingURL=attributes.js.map
