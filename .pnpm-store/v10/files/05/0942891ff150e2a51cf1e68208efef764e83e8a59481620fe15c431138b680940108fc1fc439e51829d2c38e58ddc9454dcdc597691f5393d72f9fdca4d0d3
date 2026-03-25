import { isNamedType, SpecExtension } from '../../types';
import { oasTypeOf, matchesJsonSchemaType, getSuggest, validateSchemaEnumType } from '../utils';
import { isRef } from '../../ref-utils';
import { isPlainObject } from '../../utils';

import type { UserContext } from '../../walk';
import type { Oas3Rule, Oas2Rule, Async2Rule, Async3Rule, Arazzo1Rule } from '../../visitors';

export const Struct: Oas3Rule | Oas2Rule | Async2Rule | Async3Rule | Arazzo1Rule = () => {
  return {
    any(
      node: any,
      { report, type, location, rawLocation, key, resolve, ignoreNextVisitorsOnNode }
    ) {
      const nodeType = oasTypeOf(node);
      const refLocation = rawLocation !== location ? rawLocation : undefined;

      if (type.items) {
        if (nodeType !== 'array') {
          report({
            message: `Expected type \`${type.name}\` (array) but got \`${nodeType}\``,
            from: refLocation,
          });
          ignoreNextVisitorsOnNode();
        }
        return;
      } else if (nodeType !== 'object') {
        if (type !== SpecExtension) {
          // do not validate unknown extensions structure
          report({
            message: `Expected type \`${type.name}\` (object) but got \`${nodeType}\``,
            from: refLocation,
          });
        }
        ignoreNextVisitorsOnNode();
        return;
      }

      const required =
        typeof type.required === 'function' ? type.required(node, key) : type.required;

      for (const propName of required || []) {
        if (!(node as object).hasOwnProperty(propName)) {
          report({
            message: `The field \`${propName}\` must be present on this level.`,
            from: refLocation,
            location: [{ reportOnKey: true }],
          });
        }
      }

      const allowed = type.allowed?.(node);
      if (allowed && isPlainObject(node)) {
        for (const propName in node) {
          if (
            allowed.includes(propName) ||
            (type.extensionsPrefix && propName.startsWith(type.extensionsPrefix)) ||
            !Object.keys(type.properties).includes(propName)
          ) {
            continue;
          }
          report({
            message: `The field \`${propName}\` is not allowed here.`,
            from: refLocation,
            location: location.child([propName]).key(),
          });
        }
      }

      const requiredOneOf = type.requiredOneOf || null;
      if (requiredOneOf) {
        let hasProperty = false;
        for (const propName of requiredOneOf || []) {
          if ((node as object).hasOwnProperty(propName)) {
            hasProperty = true;
          }
        }
        if (!hasProperty)
          report({
            message: `Must contain at least one of the following fields: ${type.requiredOneOf?.join(
              ', '
            )}.`,
            from: refLocation,
            location: [{ reportOnKey: true }],
          });
      }

      for (const propName of Object.keys(node)) {
        const propLocation = location.child([propName]);
        let propValue = node[propName];

        let propType = type.properties[propName];
        if (propType === undefined) propType = type.additionalProperties;
        if (typeof propType === 'function') propType = propType(propValue, propName);

        if (isNamedType(propType)) {
          continue; // do nothing for named schema, it is executed with the next any call
        }

        const propSchema = propType;
        const propValueType = oasTypeOf(propValue);

        if (propSchema === undefined) {
          if (propName.startsWith('x-')) continue;
          report({
            message: `Property \`${propName}\` is not expected here.`,
            suggest: getSuggest(propName, Object.keys(type.properties)),
            from: refLocation,
            location: propLocation.key(),
          });
          continue;
        }

        if (propSchema === null) {
          continue; // just defined, no validation
        }

        if (propSchema.resolvable !== false && isRef(propValue)) {
          propValue = resolve(propValue).node;
        }

        if (propSchema.items && propSchema.items?.enum && Array.isArray(propValue)) {
          for (let i = 0; i < propValue.length; i++) {
            validateSchemaEnumType(propSchema.items?.enum, propValue[i], propName, refLocation, {
              report,
              location: location.child([propName, i]),
            } as UserContext);
          }
        }

        if (propSchema.enum) {
          validateSchemaEnumType(propSchema.enum, propValue, propName, refLocation, {
            report,
            location: location.child([propName]),
          } as UserContext);
        } else if (propSchema.type && !matchesJsonSchemaType(propValue, propSchema.type, false)) {
          report({
            message: `Expected type \`${propSchema.type}\` but got \`${propValueType}\`.`,
            from: refLocation,
            location: propLocation,
          });
          ignoreNextVisitorsOnNode();
        } else if (propValueType === 'array' && propSchema.items?.type) {
          const itemsType = propSchema.items?.type;
          for (let i = 0; i < propValue.length; i++) {
            const item = propValue[i];
            if (!matchesJsonSchemaType(item, itemsType, false)) {
              report({
                message: `Expected type \`${itemsType}\` but got \`${oasTypeOf(item)}\`.`,
                from: refLocation,
                location: propLocation.child([i]),
              });
            }
          }
        }

        if (typeof propSchema.minimum === 'number') {
          if (propSchema.minimum > node[propName]) {
            report({
              message: `The value of the ${propName} field must be greater than or equal to ${propSchema.minimum}`,
              from: refLocation,
              location: location.child([propName]),
            });
          }
        }

        if (propName === 'nullable' && !node.type) {
          report({
            message: 'The `type` field must be defined when the `nullable` field is used.',
            location: location.child([propName]),
          });
        }
      }
    },
  };
};
