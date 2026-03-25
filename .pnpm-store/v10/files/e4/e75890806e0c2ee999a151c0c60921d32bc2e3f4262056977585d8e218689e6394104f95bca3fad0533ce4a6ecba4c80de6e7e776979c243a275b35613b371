import { isEmptyArray, isEmptyObject, isPlainObject } from '../../utils';
import { isRef } from '../../ref-utils';

import type { Oas3Decorator, Oas2Decorator } from '../../visitors';
import type { UserContext } from '../../walk';

const DEFAULT_INTERNAL_PROPERTY_NAME = 'x-internal';

export const RemoveXInternal: Oas3Decorator | Oas2Decorator = ({
  internalFlagProperty = DEFAULT_INTERNAL_PROPERTY_NAME,
}) => {
  function removeInternal(
    node: unknown,
    ctx: UserContext,
    originalMapping: Record<string, string>
  ) {
    const { parent, key } = ctx;
    let didDelete = false;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        if (isRef(node[i])) {
          const resolved = ctx.resolve(node[i]);
          if (resolved.node?.[internalFlagProperty]) {
            // First, remove the reference in the discriminator mapping, if it exists:
            if (isPlainObject(parent.discriminator?.mapping)) {
              for (const mapping in parent.discriminator.mapping) {
                if (originalMapping?.[mapping] === node[i].$ref) {
                  delete parent.discriminator.mapping[mapping];
                }
              }
            }
            node.splice(i, 1);
            didDelete = true;
            i--;
          }
        }
        if (node[i]?.[internalFlagProperty]) {
          node.splice(i, 1);
          didDelete = true;
          i--;
        }
      }
    } else if (isPlainObject(node)) {
      for (const key of Object.keys(node)) {
        if (isRef(node[key])) {
          const resolved = ctx.resolve(node[key]);
          if (isPlainObject(resolved.node) && resolved.node?.[internalFlagProperty]) {
            delete node[key];
            didDelete = true;
          }
        }
        if (isPlainObject(node[key]) && node[key]?.[internalFlagProperty]) {
          delete node[key];
          didDelete = true;
        }
      }
    }

    if (didDelete && (isEmptyObject(node) || isEmptyArray(node))) {
      delete parent[key];
    }
  }

  let originalMapping: Record<string, string> = {};
  return {
    DiscriminatorMapping: {
      enter: (mapping: Record<string, string>) => {
        originalMapping = JSON.parse(JSON.stringify(mapping));
      },
    },
    any: {
      enter: (node, ctx) => {
        removeInternal(node, ctx, originalMapping);
      },
    },
  };
};
