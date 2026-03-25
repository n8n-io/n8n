export type ScalarSchema = {
  name?: never;
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  items?: ScalarSchema;
  enum?: string[];
  isExample?: boolean;
  directResolveAs?: string;
  minimum?: number;
};

export type NormalizedScalarSchema = {
  name?: never;
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  items?: ScalarSchema;
  enum?: string[];
  directResolveAs?: NormalizedNodeType;
  resolvable: boolean;
  minimum?: number;
};

export type NodeType = {
  properties: Record<string, PropType | ResolveTypeFn>;
  additionalProperties?: PropType | ResolveTypeFn;
  items?: PropType | ResolveTypeFn;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
  requiredOneOf?: string[];
  allowed?: (value: any) => string[] | undefined;
  extensionsPrefix?: string;
};
export type PropType = string | NodeType | ScalarSchema | undefined | null;
export type ResolveTypeFn = (value: any, key: string) => string | PropType;

export type NormalizedNodeType = {
  name: string;
  properties: Record<string, NormalizedPropType | NormalizedResolveTypeFn>;
  additionalProperties?: NormalizedPropType | NormalizedResolveTypeFn;
  items?: NormalizedPropType | NormalizedResolveTypeFn;
  required?: string[] | ((value: any, key: string | number | undefined) => string[]);
  requiredOneOf?: string[];
  allowed?: (value: any) => string[] | undefined;
  extensionsPrefix?: string;
};

type NormalizedPropType = NormalizedNodeType | NormalizedScalarSchema | null | undefined;
type NormalizedResolveTypeFn = (value: any, key: string) => NormalizedPropType;

export function listOf(typeName: string) {
  return {
    name: `${typeName}List`,
    properties: {},
    items: typeName,
  };
}

export function mapOf(typeName: string) {
  return {
    name: `${typeName}Map`,
    properties: {},
    additionalProperties: () => typeName,
  };
}

export const SpecExtension: NormalizedNodeType = {
  name: 'SpecExtension',
  properties: {},
  // skip validation of additional properties for unknown extensions
  additionalProperties: { resolvable: true },
};

export function normalizeTypes(
  types: Record<string, NodeType>,
  options: { doNotResolveExamples?: boolean } = {}
): Record<string, NormalizedNodeType> {
  const normalizedTypes: Record<string, NormalizedNodeType> = {};

  for (const typeName of Object.keys(types)) {
    normalizedTypes[typeName] = {
      ...types[typeName],
      name: typeName,
    } as NormalizedNodeType;
  }

  for (const type of Object.values(normalizedTypes)) {
    normalizeType(type);
  }

  // all type trees have a SpecExtension type by default
  normalizedTypes['SpecExtension'] = SpecExtension;

  return normalizedTypes;

  function normalizeType(type: NormalizedNodeType) {
    if (type.additionalProperties) {
      type.additionalProperties = resolveType(type.additionalProperties);
    }
    if (type.items) {
      type.items = resolveType(type.items);
    }

    if (type.properties) {
      const mappedProps: Record<string, any> = {};
      for (const [propName, prop] of Object.entries(type.properties)) {
        mappedProps[propName] = resolveType(prop);

        if (options.doNotResolveExamples && prop && (prop as ScalarSchema).isExample) {
          mappedProps[propName] = {
            ...(prop as object),
            resolvable: false,
          };
        }
      }
      type.properties = mappedProps;
    }
  }

  // typings are painful here...
  function resolveType(type?: any): any {
    if (typeof type === 'string') {
      if (!normalizedTypes[type]) {
        throw new Error(`Unknown type name found: ${type}`);
      }
      return normalizedTypes[type];
    } else if (typeof type === 'function') {
      return (value: any, key: string) => {
        return resolveType(type(value, key));
      };
    } else if (type && type.name) {
      type = { ...type };
      normalizeType(type);
      return type;
    } else if (type && type.directResolveAs) {
      return {
        ...type,
        directResolveAs: resolveType(type.directResolveAs),
      };
    } else {
      return type;
    }
  }
}

export function isNamedType(t: NormalizedPropType): t is NormalizedNodeType {
  return typeof t?.name === 'string';
}
